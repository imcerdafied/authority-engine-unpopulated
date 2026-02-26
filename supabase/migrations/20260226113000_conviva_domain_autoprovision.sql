-- Expand Conviva auto-provisioning:
-- 1) Named exec emails remain admin
-- 2) Any @conviva.ai user auto-joins Conviva as viewer

CREATE OR REPLACE FUNCTION public.auto_provision_conviva_exec_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text;
  target_role text;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  normalized_email := lower(NEW.email);

  IF normalized_email IN (
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
    target_role := 'admin';
  ELSIF normalized_email LIKE '%@conviva.ai' THEN
    target_role := 'viewer';
  ELSE
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

-- Backfill existing auth users for @conviva.ai (viewer) and named execs (admin).
WITH conviva_users AS (
  SELECT
    id,
    lower(email) AS email_lc,
    CASE
      WHEN lower(email) IN (
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
      ) THEN 'admin'
      ELSE 'viewer'
    END AS desired_role
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
    OR lower(email) LIKE '%@conviva.ai'
)
INSERT INTO public.organization_memberships (org_id, user_id, role)
SELECT
  'aa6d6ba6-5e88-4c61-a511-234a8cea4c12',
  cu.id,
  cu.desired_role
FROM conviva_users cu
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_memberships om
  WHERE om.org_id = 'aa6d6ba6-5e88-4c61-a511-234a8cea4c12'
    AND om.user_id = cu.id
);

WITH conviva_execs AS (
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
  AND user_id IN (SELECT id FROM conviva_execs);
