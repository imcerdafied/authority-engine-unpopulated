-- Extend solution domain slots to support larger workspace-specific product area menus.
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S4';
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S5';
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S6';
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S7';

-- Align DB cap with product requirement (6+ active high-impact bets possible).
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
      AND id <> NEW.id;

    IF active_high_count >= 10 THEN
      RAISE EXCEPTION 'HIGH_IMPACT_CAP: Cannot exceed 10 active high-impact decisions. Close one first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
