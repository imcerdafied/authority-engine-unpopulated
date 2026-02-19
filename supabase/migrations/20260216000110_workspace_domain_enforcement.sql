-- Optional workspace-domain restriction for authenticated users.
-- Set domain with:
--   UPDATE public.auth_settings SET workspace_domain = 'yourcompany.com' WHERE id = 1;
-- Leave NULL to disable enforcement.

CREATE TABLE IF NOT EXISTS public.auth_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  workspace_domain text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.auth_settings (id, workspace_domain)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_workspace_email_allowed()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  configured_domain text;
  jwt_email text;
BEGIN
  SELECT lower(nullif(workspace_domain, ''))
    INTO configured_domain
  FROM public.auth_settings
  WHERE id = 1;

  -- If unset, do not enforce yet.
  IF configured_domain IS NULL THEN
    RETURN true;
  END IF;

  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF jwt_email = '' THEN
    RETURN false;
  END IF;

  RETURN right(jwt_email, length(configured_domain) + 1) = ('@' || configured_domain);
END;
$$;

DROP POLICY IF EXISTS "Workspace domain required for org create" ON public.organizations;
CREATE POLICY "Workspace domain required for org create"
  ON public.organizations
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_email_allowed());

DROP POLICY IF EXISTS "Workspace domain required for org update" ON public.organizations;
CREATE POLICY "Workspace domain required for org update"
  ON public.organizations
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.is_workspace_email_allowed())
  WITH CHECK (public.is_workspace_email_allowed());

DROP POLICY IF EXISTS "Workspace domain required for membership insert" ON public.organization_memberships;
CREATE POLICY "Workspace domain required for membership insert"
  ON public.organization_memberships
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_email_allowed());

DROP POLICY IF EXISTS "Workspace domain required for membership update" ON public.organization_memberships;
CREATE POLICY "Workspace domain required for membership update"
  ON public.organization_memberships
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.is_workspace_email_allowed())
  WITH CHECK (public.is_workspace_email_allowed());
