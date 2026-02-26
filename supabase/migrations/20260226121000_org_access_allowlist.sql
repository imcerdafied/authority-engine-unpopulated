-- Organization email allowlist for role overrides during join/provisioning.
CREATE TABLE IF NOT EXISTS public.org_access_allowlist (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'pod_lead', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, email)
);

ALTER TABLE public.org_access_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view org access allowlist" ON public.org_access_allowlist;
CREATE POLICY "Org members can view org access allowlist"
  ON public.org_access_allowlist FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can manage org access allowlist" ON public.org_access_allowlist;
CREATE POLICY "Admins can manage org access allowlist"
  ON public.org_access_allowlist FOR ALL TO authenticated
  USING (public.is_admin_of_org(auth.uid(), org_id))
  WITH CHECK (public.is_admin_of_org(auth.uid(), org_id));

-- Seed Conviva execs.
INSERT INTO public.org_access_allowlist (org_id, email, role)
VALUES
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'aganjam@conviva.ai', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'aganjam@conviva.com', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'hwu@conviva.ai', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'hwu@conviva.com', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'hzhang@conviva.ai', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'hzhang@conviva.com', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'jzhan@conviva.ai', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'jzhan@conviva.com', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'kzubchevich@conviva.ai', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'kzubchevich@conviva.com', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'pkohli@conviva.ai', 'admin'),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'pkohli@conviva.com', 'admin')
ON CONFLICT (org_id, email) DO UPDATE
SET role = EXCLUDED.role;

-- Refactor auto-provision trigger to use allowlist and strict domain matching.
CREATE OR REPLACE FUNCTION public.auto_provision_conviva_exec_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text;
  normalized_domain text;
  target_role text;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  normalized_email := lower(NEW.email);
  normalized_domain := split_part(normalized_email, '@', 2);
  target_role := null;

  SELECT a.role
  INTO target_role
  FROM public.org_access_allowlist a
  WHERE a.org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
    AND lower(a.email) = normalized_email
  LIMIT 1;

  IF target_role IS NULL AND normalized_domain IN ('conviva.ai', 'conviva.com') THEN
    target_role := 'viewer';
  END IF;

  IF target_role IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.organization_memberships
  SET role = CASE WHEN target_role = 'admin' THEN 'admin' ELSE role END
  WHERE org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
    AND user_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO public.organization_memberships (org_id, user_id, role)
    VALUES ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', NEW.id, target_role);
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill all existing conviva.ai/conviva.com users as viewer if missing.
WITH conviva_domain_users AS (
  SELECT id
  FROM auth.users
  WHERE split_part(lower(email), '@', 2) IN ('conviva.ai', 'conviva.com')
)
INSERT INTO public.organization_memberships (org_id, user_id, role)
SELECT
  'aa6d6ba6-5e88-4c61-a511-234a8cea4c12',
  u.id,
  'viewer'
FROM conviva_domain_users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_memberships om
  WHERE om.org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
    AND om.user_id = u.id
);

-- Ensure allowlisted execs are admin.
UPDATE public.organization_memberships om
SET role = 'admin'
FROM public.org_access_allowlist a
WHERE om.org_id = a.org_id
  AND om.org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
  AND om.user_id IN (
    SELECT id FROM auth.users u WHERE lower(u.email) = lower(a.email)
  )
  AND a.role = 'admin';
