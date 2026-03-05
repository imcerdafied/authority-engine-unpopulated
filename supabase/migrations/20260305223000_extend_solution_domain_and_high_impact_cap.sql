-- Ensure solution_domain enum exists first (some prod projects may still have solution_type or no enum at all).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'solution_domain'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'solution_type'
    ) THEN
      ALTER TYPE public.solution_type RENAME TO solution_domain;
    ELSE
      CREATE TYPE public.solution_domain AS ENUM ('S1', 'S2', 'S3', 'Cross');
    END IF;
  END IF;
END
$$;

-- Extend solution domain slots to support larger workspace-specific product area menus.
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S4';
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S5';
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S6';
ALTER TYPE public.solution_domain ADD VALUE IF NOT EXISTS 'S7';

-- Ensure decisions.solution_domain exists and is aligned to public.solution_domain.
DO $$
DECLARE
  col_udt_name text;
BEGIN
  SELECT c.udt_name
  INTO col_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'decisions'
    AND c.column_name = 'solution_domain'
  LIMIT 1;

  IF col_udt_name IS NULL THEN
    ALTER TABLE public.decisions ADD COLUMN solution_domain public.solution_domain;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'decisions'
        AND c.column_name = 'solution_type'
    ) THEN
      UPDATE public.decisions
      SET solution_domain = CASE
        WHEN solution_type::text = 'Cross-Solution' THEN 'Cross'::public.solution_domain
        WHEN solution_type::text IN ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'Cross')
          THEN solution_type::text::public.solution_domain
        ELSE 'Cross'::public.solution_domain
      END
      WHERE solution_domain IS NULL;
    ELSE
      UPDATE public.decisions
      SET solution_domain = 'Cross'::public.solution_domain
      WHERE solution_domain IS NULL;
    END IF;

    ALTER TABLE public.decisions
      ALTER COLUMN solution_domain SET NOT NULL;
  ELSIF col_udt_name = 'text' THEN
    ALTER TABLE public.decisions
      ALTER COLUMN solution_domain TYPE public.solution_domain
      USING (
        CASE
          WHEN solution_domain IN ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'Cross')
            THEN solution_domain::public.solution_domain
          ELSE 'Cross'::public.solution_domain
        END
      );
  END IF;
END
$$;

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
