CREATE OR REPLACE FUNCTION public.is_org_member(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = is_org_member.user_id
      AND om.org_id = is_org_member.org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_org(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = is_admin_of_org.user_id
      AND om.org_id = is_admin_of_org.org_id
      AND om.role = 'admin'
  );
$$;
