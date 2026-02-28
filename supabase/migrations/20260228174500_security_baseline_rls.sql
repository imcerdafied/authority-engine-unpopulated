-- Re-enable RLS baseline on core public tables and harden decisions_computed view context.
-- This migration is intentionally idempotent and minimal-risk.

ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pod_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.decision_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auth_settings'
      AND policyname = 'Authenticated can read auth settings'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated can read auth settings" ON public.auth_settings';
  END IF;
END
$$;

CREATE POLICY "Authenticated can read auth settings"
  ON public.auth_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DO $$
DECLARE
  relkind "char";
BEGIN
  SELECT c.relkind
  INTO relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'decisions_computed'
  LIMIT 1;

  IF relkind = 'v' THEN
    EXECUTE 'ALTER VIEW public.decisions_computed SET (security_invoker = true)';
  END IF;
END
$$;
