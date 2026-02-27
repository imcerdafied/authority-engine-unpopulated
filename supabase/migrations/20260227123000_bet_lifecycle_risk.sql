-- Universal bet lifecycle + risk model:
-- lifecycle: defined | activated | proving_value | scaling | durable | closed
-- risk: healthy | watch | at_risk

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'bet_risk_level' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.bet_risk_level AS ENUM ('healthy', 'watch', 'at_risk');
  END IF;
END
$$;

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS risk_level public.bet_risk_level NOT NULL DEFAULT 'healthy';

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS legacy_status_text text;

UPDATE public.decisions
SET legacy_status_text = status::text
WHERE legacy_status_text IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'decision_status_new' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.decision_status_new AS ENUM (
      'defined',
      'activated',
      'proving_value',
      'scaling',
      'durable',
      'closed'
    );
  END IF;
END
$$;

DROP VIEW IF EXISTS public.decisions_computed;

ALTER TABLE public.decisions
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.decisions
  ALTER COLUMN status TYPE public.decision_status_new
  USING (
    CASE
      WHEN lower(coalesce(legacy_status_text, '')) IN ('hypothesis defined', 'hypothesis', 'defined', 'draft') THEN 'defined'
      WHEN lower(coalesce(legacy_status_text, '')) IN ('activated', 'active') THEN 'activated'
      WHEN lower(coalesce(legacy_status_text, '')) IN ('piloting', 'proving value', 'proving_value') THEN 'proving_value'
      WHEN lower(coalesce(legacy_status_text, '')) = 'scaling' THEN 'scaling'
      WHEN lower(coalesce(legacy_status_text, '')) IN ('durable', 'accepted') THEN 'durable'
      WHEN lower(coalesce(legacy_status_text, '')) IN ('closed', 'archived', 'rejected') THEN 'closed'
      WHEN lower(coalesce(legacy_status_text, '')) IN ('at risk', 'at_risk', 'blocked') THEN 'proving_value'
      ELSE 'defined'
    END
  )::public.decision_status_new;

UPDATE public.decisions
SET risk_level = 'at_risk'
WHERE lower(coalesce(legacy_status_text, '')) IN ('at risk', 'at_risk', 'blocked')
  AND risk_level = 'healthy';

ALTER TYPE public.decision_status RENAME TO decision_status_legacy;
ALTER TYPE public.decision_status_new RENAME TO decision_status;

ALTER TABLE public.decisions
  ALTER COLUMN status SET DEFAULT 'defined'::public.decision_status;

-- Keep the legacy snapshot column so we never lose historical semantics from unknown status strings.

CREATE OR REPLACE FUNCTION public.enforce_high_impact_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_high_count INTEGER;
BEGIN
  IF NEW.status::text <> 'closed' AND NEW.impact_tier = 'High' THEN
    IF TG_OP = 'UPDATE'
      AND OLD.status::text <> 'closed'
      AND OLD.impact_tier = 'High' THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO active_high_count
    FROM public.decisions
    WHERE org_id = NEW.org_id
      AND status::text <> 'closed'
      AND impact_tier = 'High'
      AND id != NEW.id;

    IF active_high_count >= 5 THEN
      RAISE EXCEPTION 'HIGH_IMPACT_CAP: Cannot exceed 5 active high-impact decisions. Close one first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_outcome_required()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status::text = 'activated'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.outcome_target IS NULL OR TRIM(NEW.outcome_target) = '' THEN
      RAISE EXCEPTION 'OUTCOME_REQUIRED: Cannot activate without an Outcome Target.';
    END IF;
    IF NEW.owner IS NULL OR TRIM(NEW.owner) = '' THEN
      RAISE EXCEPTION 'OWNER_REQUIRED: Cannot activate without an assigned Owner.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_decision_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_age INTEGER;
  v_max INTEGER;
  v_is_active BOOLEAN;
BEGIN
  v_max := COALESCE(NEW.slice_deadline_days, 10);
  v_is_active := NEW.status::text <> 'closed';

  IF NEW.status::text = 'activated'
    AND (TG_OP = 'INSERT' OR COALESCE(OLD.status::text, '') <> 'activated') THEN
    NEW.activated_at := now();
    NEW.slice_due_at := now() + (v_max || ' days')::INTERVAL;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.slice_due_at IS NULL THEN
    NEW.slice_due_at := NEW.created_at + (v_max || ' days')::INTERVAL;
  END IF;

  v_age := EXTRACT(DAY FROM (now() - NEW.created_at))::INTEGER;
  NEW.executive_attention_required := (NEW.risk_level = 'at_risk' AND v_age > 7);

  IF v_is_active THEN
    IF NEW.slice_due_at IS NOT NULL AND now() > NEW.slice_due_at THEN
      NEW.decision_health := 'Degrading';
    ELSIF NEW.slice_due_at IS NOT NULL AND EXTRACT(DAY FROM (NEW.slice_due_at - now()))::INTEGER <= 3 THEN
      NEW.decision_health := 'At Risk';
    ELSE
      NEW.decision_health := 'On Track';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_decision_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.decision_events (decision_id, org_id, event_type, from_status, to_status, actor_id)
    VALUES (
      NEW.id,
      NEW.org_id,
      CASE
        WHEN NEW.status::text = 'activated' THEN 'activated'
        WHEN NEW.status::text = 'closed' THEN 'closed'
        ELSE 'status_change'
      END,
      OLD.status::text,
      NEW.status::text,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_decision_status_event ON public.decisions;
CREATE TRIGGER log_decision_status_event
  AFTER UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_decision_event();

DROP TRIGGER IF EXISTS compute_decision_fields_trigger ON public.decisions;
CREATE TRIGGER compute_decision_fields_trigger
  BEFORE INSERT OR UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_decision_fields();

DROP TRIGGER IF EXISTS enforce_outcome_required_trigger ON public.decisions;
CREATE TRIGGER enforce_outcome_required_trigger
  BEFORE INSERT OR UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_outcome_required();

DROP TRIGGER IF EXISTS enforce_high_impact_cap_trigger ON public.decisions;
CREATE TRIGGER enforce_high_impact_cap_trigger
  BEFORE INSERT OR UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_high_impact_cap();

CREATE OR REPLACE VIEW public.decisions_computed AS
SELECT
  d.*,
  EXTRACT(DAY FROM (now() - d.created_at))::integer AS age_days,
  CASE
    WHEN d.slice_due_at IS NOT NULL
    THEN EXTRACT(DAY FROM (d.slice_due_at - now()))::integer
    ELSE (COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::integer)
  END AS slice_remaining,
  CASE
    WHEN d.status::text <> 'closed' AND d.slice_due_at IS NOT NULL AND now() > d.slice_due_at THEN true
    WHEN d.status::text <> 'closed' AND d.slice_due_at IS NULL AND EXTRACT(DAY FROM (now() - d.created_at))::integer > COALESCE(d.slice_deadline_days, 10) THEN true
    ELSE false
  END AS is_exceeded,
  CASE
    WHEN d.status::text <> 'closed' THEN
      CASE
        WHEN d.slice_due_at IS NOT NULL THEN EXTRACT(DAY FROM (d.slice_due_at - now()))::integer BETWEEN 0 AND 3
        ELSE (COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::integer) BETWEEN 0 AND 3
      END
    ELSE false
  END AS is_urgent,
  (d.status::text <> 'closed' AND EXTRACT(DAY FROM (now() - d.created_at))::integer > 14) AS is_aging,
  (d.status::text <> 'closed' AND d.outcome_target IS NULL) AS is_unbound,
  (d.risk_level = 'at_risk' AND EXTRACT(DAY FROM (now() - d.created_at))::integer > 7) AS needs_exec_attention
FROM public.decisions d;
