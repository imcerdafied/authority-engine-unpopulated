-- Auto-provision specific Conviva exec emails into the Conviva org as admins.
-- This runs on auth.users insert, independent of client-side invite/join flow.

CREATE OR REPLACE FUNCTION public.auto_provision_conviva_exec_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(NEW.email) IN (
    'aganjam@conviva.ai',
    'aganjam@conviva.com',
    'hwu@conviva.ai',
    'hwu@conviva.com',
    'hzhang@conviva.ai',
    'hzhang@conviva.com',
    'jzhan@conviva.ai',
    'jzhan@conviva.com',
    'kzubchevich@conviva.ai',
    'kzubchevich@conviva.com',
    'pkohli@conviva.ai',
    'pkohli@conviva.com'
  ) THEN
    UPDATE public.organization_memberships
    SET role = 'admin'
    WHERE org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
      AND user_id = NEW.id;

    IF NOT FOUND THEN
      INSERT INTO public.organization_memberships (org_id, user_id, role)
      VALUES ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', NEW.id, 'admin');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_provision_conviva_exec_admin_trigger ON auth.users;
CREATE TRIGGER auto_provision_conviva_exec_admin_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_provision_conviva_exec_admin();

-- Backfill existing auth users matching the allowlist.
WITH conviva_exec_users AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) IN (
    'aganjam@conviva.ai',
    'aganjam@conviva.com',
    'hwu@conviva.ai',
    'hwu@conviva.com',
    'hzhang@conviva.ai',
    'hzhang@conviva.com',
    'jzhan@conviva.ai',
    'jzhan@conviva.com',
    'kzubchevich@conviva.ai',
    'kzubchevich@conviva.com',
    'pkohli@conviva.ai',
    'pkohli@conviva.com'
  )
)
INSERT INTO public.organization_memberships (org_id, user_id, role)
SELECT 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12', id, 'admin'
FROM conviva_exec_users
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_memberships om
  WHERE om.org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
    AND om.user_id = conviva_exec_users.id
);

WITH conviva_exec_users AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) IN (
    'aganjam@conviva.ai',
    'aganjam@conviva.com',
    'hwu@conviva.ai',
    'hwu@conviva.com',
    'hzhang@conviva.ai',
    'hzhang@conviva.com',
    'jzhan@conviva.ai',
    'jzhan@conviva.com',
    'kzubchevich@conviva.ai',
    'kzubchevich@conviva.com',
    'pkohli@conviva.ai',
    'pkohli@conviva.com'
  )
)
UPDATE public.organization_memberships
SET role = 'admin'
WHERE org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
  AND user_id IN (SELECT id FROM conviva_exec_users);
