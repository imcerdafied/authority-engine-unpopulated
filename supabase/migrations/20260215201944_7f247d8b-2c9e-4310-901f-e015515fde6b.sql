
-- Fix the broken self-insert membership policy (subquery references itself instead of the new row)
DROP POLICY IF EXISTS "Creator can self-insert membership" ON public.organization_memberships;
CREATE POLICY "Creator can self-insert membership" ON public.organization_memberships
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'admin'::app_role 
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_memberships om2 
      WHERE om2.org_id = organization_memberships.org_id
    )
  );

-- Ensure all policies are PERMISSIVE (drop and recreate as permissive)
-- Organizations
DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), id));

DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update orgs" ON public.organizations;
CREATE POLICY "Admins can update orgs" ON public.organizations FOR UPDATE TO authenticated USING (public.is_admin_of_org(auth.uid(), id));

-- Organization memberships
DROP POLICY IF EXISTS "Members can view memberships in their org" ON public.organization_memberships;
CREATE POLICY "Members can view memberships in their org" ON public.organization_memberships FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can insert memberships" ON public.organization_memberships;
CREATE POLICY "Admins can insert memberships" ON public.organization_memberships FOR INSERT TO authenticated WITH CHECK (public.is_admin_of_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can update memberships" ON public.organization_memberships;
CREATE POLICY "Admins can update memberships" ON public.organization_memberships FOR UPDATE TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can delete memberships" ON public.organization_memberships;
CREATE POLICY "Admins can delete memberships" ON public.organization_memberships FOR DELETE TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));

-- Decisions
DROP POLICY IF EXISTS "Org members can view decisions" ON public.decisions;
CREATE POLICY "Org members can view decisions" ON public.decisions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can insert decisions" ON public.decisions;
CREATE POLICY "Admins and pod leads can insert decisions" ON public.decisions FOR INSERT TO authenticated WITH CHECK (
  public.is_org_member(auth.uid(), org_id) AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
);

DROP POLICY IF EXISTS "Admins and pod leads can update decisions" ON public.decisions;
CREATE POLICY "Admins and pod leads can update decisions" ON public.decisions FOR UPDATE TO authenticated USING (
  public.is_org_member(auth.uid(), org_id) AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
);

DROP POLICY IF EXISTS "Admins can delete decisions" ON public.decisions;
CREATE POLICY "Admins can delete decisions" ON public.decisions FOR DELETE TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));

-- Signals
DROP POLICY IF EXISTS "Org members can view signals" ON public.signals;
CREATE POLICY "Org members can view signals" ON public.signals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins and pod leads can insert signals" ON public.signals;
CREATE POLICY "Admins and pod leads can insert signals" ON public.signals FOR INSERT TO authenticated WITH CHECK (
  public.is_org_member(auth.uid(), org_id) AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
);

DROP POLICY IF EXISTS "Admins and pod leads can update signals" ON public.signals;
CREATE POLICY "Admins and pod leads can update signals" ON public.signals FOR UPDATE TO authenticated USING (
  public.is_org_member(auth.uid(), org_id) AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
);

DROP POLICY IF EXISTS "Admins can delete signals" ON public.signals;
CREATE POLICY "Admins can delete signals" ON public.signals FOR DELETE TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));

-- Pods
DROP POLICY IF EXISTS "Org members can view pods" ON public.pods;
CREATE POLICY "Org members can view pods" ON public.pods FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can insert pods" ON public.pods;
CREATE POLICY "Admins can insert pods" ON public.pods FOR INSERT TO authenticated WITH CHECK (public.is_admin_of_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can update pods" ON public.pods;
CREATE POLICY "Admins can update pods" ON public.pods FOR UPDATE TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can delete pods" ON public.pods;
CREATE POLICY "Admins can delete pods" ON public.pods FOR DELETE TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));

-- Pod initiatives
DROP POLICY IF EXISTS "Org members can view pod initiatives" ON public.pod_initiatives;
CREATE POLICY "Org members can view pod initiatives" ON public.pod_initiatives FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_org_member(auth.uid(), p.org_id))
);

DROP POLICY IF EXISTS "Admins can insert pod initiatives" ON public.pod_initiatives;
CREATE POLICY "Admins can insert pod initiatives" ON public.pod_initiatives FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_admin_of_org(auth.uid(), p.org_id))
);

DROP POLICY IF EXISTS "Admins can update pod initiatives" ON public.pod_initiatives;
CREATE POLICY "Admins can update pod initiatives" ON public.pod_initiatives FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_admin_of_org(auth.uid(), p.org_id))
);

DROP POLICY IF EXISTS "Admins can delete pod initiatives" ON public.pod_initiatives;
CREATE POLICY "Admins can delete pod initiatives" ON public.pod_initiatives FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_admin_of_org(auth.uid(), p.org_id))
);

-- Closed decisions
DROP POLICY IF EXISTS "Org members can view closed decisions" ON public.closed_decisions;
CREATE POLICY "Org members can view closed decisions" ON public.closed_decisions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins and pod leads can insert closed decisions" ON public.closed_decisions;
CREATE POLICY "Admins and pod leads can insert closed decisions" ON public.closed_decisions FOR INSERT TO authenticated WITH CHECK (
  public.is_org_member(auth.uid(), org_id) AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
);

DROP POLICY IF EXISTS "Admins can delete closed decisions" ON public.closed_decisions;
CREATE POLICY "Admins can delete closed decisions" ON public.closed_decisions FOR DELETE TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));

-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
