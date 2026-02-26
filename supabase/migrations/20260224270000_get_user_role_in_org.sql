CREATE OR REPLACE FUNCTION public.get_user_role_in_org(user_id uuid, org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.role::text
  FROM public.organization_memberships om
  WHERE om.user_id = get_user_role_in_org.user_id
    AND om.org_id = get_user_role_in_org.org_id
  LIMIT 1;
$$;
