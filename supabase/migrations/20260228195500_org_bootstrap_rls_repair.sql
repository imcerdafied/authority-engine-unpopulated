-- Repair baseline org bootstrap RLS so authenticated members can always resolve org context.
-- Safe/idempotent: drops and recreates only org + membership core policies.

ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
CREATE POLICY "Members can view their orgs"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), id));

DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update orgs" ON public.organizations;
CREATE POLICY "Admins can update orgs"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_admin_of_org(auth.uid(), id))
WITH CHECK (public.is_admin_of_org(auth.uid(), id));

DROP POLICY IF EXISTS "Members can view memberships in their org" ON public.organization_memberships;
CREATE POLICY "Members can view memberships in their org"
ON public.organization_memberships
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Creator can self-insert membership" ON public.organization_memberships;
CREATE POLICY "Creator can self-insert membership"
ON public.organization_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships om2
    WHERE om2.org_id = organization_memberships.org_id
  )
);

DROP POLICY IF EXISTS "Admins can insert memberships" ON public.organization_memberships;
CREATE POLICY "Admins can insert memberships"
ON public.organization_memberships
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_of_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can update memberships" ON public.organization_memberships;
CREATE POLICY "Admins can update memberships"
ON public.organization_memberships
FOR UPDATE
TO authenticated
USING (public.is_admin_of_org(auth.uid(), org_id))
WITH CHECK (public.is_admin_of_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can delete memberships" ON public.organization_memberships;
CREATE POLICY "Admins can delete memberships"
ON public.organization_memberships
FOR DELETE
TO authenticated
USING (public.is_admin_of_org(auth.uid(), org_id));
