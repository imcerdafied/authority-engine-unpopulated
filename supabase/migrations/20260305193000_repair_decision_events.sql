-- Repair drift where status-change trigger exists but decision_events table is missing.
-- This migration is idempotent and safe to run on production.

CREATE TABLE IF NOT EXISTS public.decision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_events
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS decision_id uuid,
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS from_status text,
  ADD COLUMN IF NOT EXISTS to_status text,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.decision_events
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

UPDATE public.decision_events
SET created_at = now()
WHERE created_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.decision_events'::regclass
      AND conname = 'decision_events_pkey'
  ) THEN
    ALTER TABLE public.decision_events
      ADD CONSTRAINT decision_events_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.decision_events'::regclass
      AND conname = 'decision_events_decision_id_fkey'
  ) THEN
    ALTER TABLE public.decision_events
      ADD CONSTRAINT decision_events_decision_id_fkey
      FOREIGN KEY (decision_id) REFERENCES public.decisions(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.decision_events'::regclass
      AND conname = 'decision_events_org_id_fkey'
  ) THEN
    ALTER TABLE public.decision_events
      ADD CONSTRAINT decision_events_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view decision events" ON public.decision_events;
CREATE POLICY "Org members can view decision events"
  ON public.decision_events
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "System can insert decision events" ON public.decision_events;
CREATE POLICY "System can insert decision events"
  ON public.decision_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_decision_events_decision ON public.decision_events(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_org ON public.decision_events(org_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_created_at ON public.decision_events(created_at DESC);

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
