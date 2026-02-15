
-- 1. Validation trigger: prevent > 5 active High-impact decisions per org
CREATE OR REPLACE FUNCTION public.enforce_high_impact_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_high_count INTEGER;
BEGIN
  IF NEW.status = 'Active' AND NEW.impact_tier = 'High' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'Active' AND OLD.impact_tier = 'High' THEN
      RETURN NEW;
    END IF;
    
    SELECT COUNT(*) INTO active_high_count
    FROM decisions
    WHERE org_id = NEW.org_id
      AND status = 'Active'
      AND impact_tier = 'High'
      AND id != NEW.id;
    
    IF active_high_count >= 5 THEN
      RAISE EXCEPTION 'HIGH_IMPACT_CAP: Cannot exceed 5 active high-impact decisions. Close one first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_high_impact_cap_trigger
BEFORE INSERT OR UPDATE ON public.decisions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_high_impact_cap();

-- 2. Validation trigger: outcome_target and owner required to activate
CREATE OR REPLACE FUNCTION public.enforce_outcome_required()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Active' AND (NEW.outcome_target IS NULL OR TRIM(NEW.outcome_target) = '') THEN
    RAISE EXCEPTION 'OUTCOME_REQUIRED: Cannot activate without an Outcome Target.';
  END IF;
  IF NEW.status = 'Active' AND (NEW.owner IS NULL OR TRIM(NEW.owner) = '') THEN
    RAISE EXCEPTION 'OWNER_REQUIRED: Cannot activate without an assigned Owner.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_outcome_required_trigger
BEFORE INSERT OR UPDATE ON public.decisions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_outcome_required();

-- 3. Auto-escalate decision_health based on slice deadline
CREATE OR REPLACE FUNCTION public.auto_update_decision_health()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_age INTEGER;
  v_max INTEGER;
BEGIN
  IF NEW.status = 'Active' THEN
    v_age := EXTRACT(DAY FROM (now() - NEW.created_at))::INTEGER;
    v_max := COALESCE(NEW.slice_deadline_days, 10);
    
    IF v_age > v_max THEN
      NEW.decision_health := 'Degrading';
    ELSIF v_max - v_age <= 3 THEN
      IF NEW.decision_health IS NULL OR NEW.decision_health = 'On Track' THEN
        NEW.decision_health := 'At Risk';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_update_decision_health_trigger
BEFORE INSERT OR UPDATE ON public.decisions
FOR EACH ROW
EXECUTE FUNCTION public.auto_update_decision_health();

-- 4. View with computed fields
CREATE OR REPLACE VIEW public.decisions_computed AS
SELECT
  d.*,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER AS age_days,
  COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::INTEGER AS slice_remaining,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER > COALESCE(d.slice_deadline_days, 10) AS is_exceeded,
  COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::INTEGER BETWEEN 0 AND 3 AS is_urgent,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER > 7 AS is_aging,
  d.outcome_category IS NULL AS is_unbound,
  d.status = 'Blocked' AND EXTRACT(DAY FROM (now() - d.created_at))::INTEGER > 7 AS needs_exec_attention
FROM public.decisions d;

GRANT SELECT ON public.decisions_computed TO authenticated;
GRANT SELECT ON public.decisions_computed TO anon;
