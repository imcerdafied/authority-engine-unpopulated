
-- Drop dependent view first
DROP VIEW IF EXISTS public.decisions_computed;

-- Drop old health trigger
DROP TRIGGER IF EXISTS auto_update_decision_health_trigger ON public.decisions;
DROP FUNCTION IF EXISTS public.auto_update_decision_health();

-- ============================================================
-- 1. NEW ENUM: solution_domain (replaces solution_type)
-- ============================================================
CREATE TYPE public.solution_domain AS ENUM ('S1', 'S2', 'S3', 'Cross');

-- Add new columns
ALTER TABLE public.decisions ADD COLUMN solution_domain public.solution_domain;
ALTER TABLE public.signals ADD COLUMN solution_domain public.solution_domain;
ALTER TABLE public.pods ADD COLUMN solution_domain public.solution_domain;
ALTER TABLE public.closed_decisions ADD COLUMN solution_domain public.solution_domain;

-- Migrate data
UPDATE public.decisions SET solution_domain =
  CASE WHEN solution_type = 'Cross-Solution' THEN 'Cross'::public.solution_domain
       ELSE solution_type::text::public.solution_domain END;
UPDATE public.signals SET solution_domain =
  CASE WHEN solution_type IS NULL THEN NULL
       WHEN solution_type = 'Cross-Solution' THEN 'Cross'::public.solution_domain
       ELSE solution_type::text::public.solution_domain END;
UPDATE public.pods SET solution_domain =
  CASE WHEN solution_type = 'Cross-Solution' THEN 'Cross'::public.solution_domain
       ELSE solution_type::text::public.solution_domain END;
UPDATE public.closed_decisions SET solution_domain =
  CASE WHEN solution_type = 'Cross-Solution' THEN 'Cross'::public.solution_domain
       ELSE solution_type::text::public.solution_domain END;

-- Set NOT NULL and drop old columns
ALTER TABLE public.decisions ALTER COLUMN solution_domain SET NOT NULL;
ALTER TABLE public.decisions DROP COLUMN solution_type;

ALTER TABLE public.pods ALTER COLUMN solution_domain SET NOT NULL;
ALTER TABLE public.pods DROP COLUMN solution_type;

ALTER TABLE public.closed_decisions ALTER COLUMN solution_domain SET NOT NULL;
ALTER TABLE public.closed_decisions DROP COLUMN solution_type;

ALTER TABLE public.signals DROP COLUMN solution_type;

DROP TYPE public.solution_type;

-- ============================================================
-- 2. NEW ENUM: outcome_category replacement
-- ============================================================
CREATE TYPE public.outcome_category_v2 AS ENUM (
  'ARR', 'NRR', 'DPI_Adoption', 'Agent_Trust', 'Live_Event_Risk', 'Operational_Efficiency'
);

ALTER TABLE public.decisions ADD COLUMN outcome_category_new public.outcome_category_v2;

UPDATE public.decisions SET outcome_category_new =
  CASE
    WHEN outcome_category IN ('Revenue', 'Enterprise Renewal') THEN 'ARR'::public.outcome_category_v2
    WHEN outcome_category IN ('Retention', 'Conversion') THEN 'NRR'::public.outcome_category_v2
    WHEN outcome_category = 'Platform Adoption' THEN 'DPI_Adoption'::public.outcome_category_v2
    WHEN outcome_category IN ('Agent Performance', 'Agent Trust') THEN 'Agent_Trust'::public.outcome_category_v2
    WHEN outcome_category IN ('Trust', 'Executive Credibility', 'QoE Risk') THEN 'Live_Event_Risk'::public.outcome_category_v2
    WHEN outcome_category = 'Efficiency' THEN 'Operational_Efficiency'::public.outcome_category_v2
    ELSE NULL
  END;

ALTER TABLE public.decisions DROP COLUMN outcome_category;
ALTER TABLE public.decisions RENAME COLUMN outcome_category_new TO outcome_category;
DROP TYPE public.outcome_category;
ALTER TYPE public.outcome_category_v2 RENAME TO outcome_category;

-- ============================================================
-- 3. ADD NEW COLUMNS
-- ============================================================
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS slice_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executive_attention_required BOOLEAN NOT NULL DEFAULT false;

-- Backfill
UPDATE public.decisions
SET slice_due_at = created_at + (COALESCE(slice_deadline_days, 10) || ' days')::INTERVAL
WHERE slice_due_at IS NULL;

UPDATE public.decisions
SET executive_attention_required = (status = 'Blocked' AND EXTRACT(DAY FROM (now() - created_at))::INTEGER > 7);

-- ============================================================
-- 4. UNIFIED TRIGGER for computed fields
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_decision_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_age INTEGER;
  v_max INTEGER;
BEGIN
  v_max := COALESCE(NEW.slice_deadline_days, 10);

  -- Compute slice_due_at on insert or when deadline changes
  IF TG_OP = 'INSERT' OR NEW.slice_deadline_days IS DISTINCT FROM OLD.slice_deadline_days THEN
    NEW.slice_due_at := NEW.created_at + (v_max || ' days')::INTERVAL;
  END IF;

  v_age := EXTRACT(DAY FROM (now() - NEW.created_at))::INTEGER;

  -- Compute executive_attention_required
  NEW.executive_attention_required := (NEW.status = 'Blocked' AND v_age > 7);

  -- Compute decision_health for active decisions
  IF NEW.status = 'Active' THEN
    IF v_age > v_max THEN
      NEW.decision_health := 'Degrading';
    ELSIF v_max - v_age <= 3 THEN
      NEW.decision_health := 'At Risk';
    ELSE
      NEW.decision_health := 'On Track';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER compute_decision_fields_trigger
BEFORE INSERT OR UPDATE ON public.decisions
FOR EACH ROW
EXECUTE FUNCTION public.compute_decision_fields();

-- ============================================================
-- 5. RECREATE VIEW with new schema
-- ============================================================
CREATE VIEW public.decisions_computed
WITH (security_invoker = true)
AS
SELECT
  d.*,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER AS age_days,
  EXTRACT(DAY FROM (d.slice_due_at - now()))::INTEGER AS slice_remaining,
  now() > d.slice_due_at AS is_exceeded,
  EXTRACT(DAY FROM (d.slice_due_at - now()))::INTEGER BETWEEN 0 AND 3 AS is_urgent,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER > 7 AS is_aging,
  d.outcome_category IS NULL AS is_unbound
FROM public.decisions d;

GRANT SELECT ON public.decisions_computed TO authenticated;
GRANT SELECT ON public.decisions_computed TO anon;
