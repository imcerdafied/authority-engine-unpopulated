
-- 1. Add missing columns to decisions
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS exposure_value text,
  ADD COLUMN IF NOT EXISTS actual_outcome_value text,
  ADD COLUMN IF NOT EXISTS outcome_delta text,
  ADD COLUMN IF NOT EXISTS closure_note text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- 2. Create decision_events table
CREATE TABLE public.decision_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  event_type text NOT NULL, -- e.g. 'status_change', 'activated', 'closed'
  from_status text,
  to_status text,
  actor_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decision events"
  ON public.decision_events FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "System can insert decision events"
  ON public.decision_events FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE INDEX idx_decision_events_decision ON public.decision_events(decision_id);

-- 3. Update the decisions_computed view to include new columns
DROP VIEW IF EXISTS public.decisions_computed;
CREATE VIEW public.decisions_computed AS
SELECT
  d.*,
  EXTRACT(DAY FROM (now() - d.created_at))::integer AS age_days,
  CASE
    WHEN d.slice_due_at IS NOT NULL
    THEN EXTRACT(DAY FROM (d.slice_due_at - now()))::integer
    ELSE (COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::integer)
  END AS slice_remaining,
  CASE
    WHEN d.status = 'Active' AND d.slice_due_at IS NOT NULL AND now() > d.slice_due_at THEN true
    WHEN d.status = 'Active' AND d.slice_due_at IS NULL AND EXTRACT(DAY FROM (now() - d.created_at))::integer > COALESCE(d.slice_deadline_days, 10) THEN true
    ELSE false
  END AS is_exceeded,
  CASE
    WHEN d.status = 'Active' THEN
      CASE
        WHEN d.slice_due_at IS NOT NULL THEN EXTRACT(DAY FROM (d.slice_due_at - now()))::integer BETWEEN 0 AND 3
        ELSE (COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::integer) BETWEEN 0 AND 3
      END
    ELSE false
  END AS is_urgent,
  (d.status = 'Active' AND EXTRACT(DAY FROM (now() - d.created_at))::integer > 14) AS is_aging,
  (d.status = 'Active' AND d.outcome_target IS NULL) AS is_unbound,
  (d.status = 'Blocked' AND EXTRACT(DAY FROM (now() - d.created_at))::integer > 7) AS needs_exec_attention
FROM public.decisions d;

-- 4. Replace enforce_outcome_required trigger function with full workflow validation
CREATE OR REPLACE FUNCTION public.enforce_outcome_required()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Draft → Active validation
  IF NEW.status = 'Active' AND (TG_OP = 'INSERT' OR OLD.status = 'Draft' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.outcome_category IS NULL THEN
      RAISE EXCEPTION 'OUTCOME_CATEGORY_REQUIRED: Cannot activate without an Outcome Category.';
    END IF;
    IF NEW.expected_impact IS NULL OR TRIM(NEW.expected_impact) = '' THEN
      RAISE EXCEPTION 'EXPECTED_IMPACT_REQUIRED: Cannot activate without Expected Impact.';
    END IF;
    IF NEW.exposure_value IS NULL OR TRIM(NEW.exposure_value) = '' THEN
      RAISE EXCEPTION 'EXPOSURE_REQUIRED: Cannot activate without Exposure Value.';
    END IF;
    IF NEW.owner IS NULL OR TRIM(NEW.owner) = '' THEN
      RAISE EXCEPTION 'OWNER_REQUIRED: Cannot activate without an assigned Owner.';
    END IF;
    IF NEW.outcome_target IS NULL OR TRIM(NEW.outcome_target) = '' THEN
      RAISE EXCEPTION 'OUTCOME_REQUIRED: Cannot activate without an Outcome Target.';
    END IF;
  END IF;

  -- Active → Closed validation
  IF NEW.status = 'Closed' AND OLD.status = 'Active' THEN
    IF NEW.actual_outcome_value IS NULL OR TRIM(NEW.actual_outcome_value) = '' THEN
      RAISE EXCEPTION 'ACTUAL_OUTCOME_REQUIRED: Cannot close without Actual Outcome Value.';
    END IF;
    IF NEW.outcome_delta IS NULL OR TRIM(NEW.outcome_delta) = '' THEN
      RAISE EXCEPTION 'OUTCOME_DELTA_REQUIRED: Cannot close without Outcome Delta.';
    END IF;
    IF NEW.closure_note IS NULL OR TRIM(NEW.closure_note) = '' THEN
      RAISE EXCEPTION 'CLOSURE_NOTE_REQUIRED: Cannot close without a Closure Note.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update compute_decision_fields to set activated_at and slice_due_at on activation
CREATE OR REPLACE FUNCTION public.compute_decision_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_age INTEGER;
  v_max INTEGER;
BEGIN
  v_max := COALESCE(NEW.slice_deadline_days, 10);

  -- Set activated_at and slice_due_at when moving to Active
  IF NEW.status = 'Active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Active') THEN
    NEW.activated_at := now();
    NEW.slice_due_at := now() + (v_max || ' days')::INTERVAL;
  END IF;

  -- Fallback: compute slice_due_at on insert if not set
  IF TG_OP = 'INSERT' AND NEW.slice_due_at IS NULL THEN
    NEW.slice_due_at := NEW.created_at + (v_max || ' days')::INTERVAL;
  END IF;

  v_age := EXTRACT(DAY FROM (now() - NEW.created_at))::INTEGER;

  -- Compute executive_attention_required
  NEW.executive_attention_required := (NEW.status = 'Blocked' AND v_age > 7);

  -- Compute decision_health for active decisions
  IF NEW.status = 'Active' THEN
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

-- 6. Create trigger to log status change events
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
        WHEN NEW.status = 'Active' THEN 'activated'
        WHEN NEW.status = 'Closed' THEN 'closed'
        WHEN NEW.status = 'Blocked' THEN 'blocked'
        ELSE 'status_change'
      END,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the event logging trigger (runs AFTER so it doesn't block the update)
DROP TRIGGER IF EXISTS log_decision_status_event ON public.decisions;
CREATE TRIGGER log_decision_status_event
  AFTER UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_decision_event();

-- Make sure compute and enforce triggers exist
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
