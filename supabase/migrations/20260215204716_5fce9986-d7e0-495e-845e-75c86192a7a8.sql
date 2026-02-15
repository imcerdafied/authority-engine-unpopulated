
-- Fix all RLS policies: they were created as RESTRICTIVE (which requires a PERMISSIVE policy to exist).
-- We need to drop them and recreate as PERMISSIVE.

-- organizations
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update orgs" ON public.organizations;

CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT TO authenticated USING (is_org_member(auth.uid(), id));
CREATE POLICY "Admins can update orgs" ON public.organizations FOR UPDATE TO authenticated USING (is_admin_of_org(auth.uid(), id));

-- organization_memberships
DROP POLICY IF EXISTS "Creator can self-insert membership" ON public.organization_memberships;
DROP POLICY IF EXISTS "Members can view memberships in their org" ON public.organization_memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.organization_memberships;

CREATE POLICY "Creator can self-insert membership" ON public.organization_memberships FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND (role = 'admin') AND (NOT EXISTS (SELECT 1 FROM organization_memberships om2 WHERE om2.org_id = organization_memberships.org_id)));
CREATE POLICY "Admins can insert memberships" ON public.organization_memberships FOR INSERT TO authenticated WITH CHECK (is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Members can view memberships in their org" ON public.organization_memberships FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins can update memberships" ON public.organization_memberships FOR UPDATE TO authenticated USING (is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Admins can delete memberships" ON public.organization_memberships FOR DELETE TO authenticated USING (is_admin_of_org(auth.uid(), org_id));

-- decisions
DROP POLICY IF EXISTS "Org members can view decisions" ON public.decisions;
DROP POLICY IF EXISTS "Admins and pod leads can insert decisions" ON public.decisions;
DROP POLICY IF EXISTS "Admins and pod leads can update decisions" ON public.decisions;
DROP POLICY IF EXISTS "Admins can delete decisions" ON public.decisions;

CREATE POLICY "Org members can view decisions" ON public.decisions FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins and pod leads can insert decisions" ON public.decisions FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id) AND (get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])));
CREATE POLICY "Admins and pod leads can update decisions" ON public.decisions FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id) AND (get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])));
CREATE POLICY "Admins can delete decisions" ON public.decisions FOR DELETE TO authenticated USING (is_admin_of_org(auth.uid(), org_id));

-- signals
DROP POLICY IF EXISTS "Org members can view signals" ON public.signals;
DROP POLICY IF EXISTS "Admins and pod leads can insert signals" ON public.signals;
DROP POLICY IF EXISTS "Admins and pod leads can update signals" ON public.signals;
DROP POLICY IF EXISTS "Admins can delete signals" ON public.signals;

CREATE POLICY "Org members can view signals" ON public.signals FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins and pod leads can insert signals" ON public.signals FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id) AND (get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])));
CREATE POLICY "Admins and pod leads can update signals" ON public.signals FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id) AND (get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])));
CREATE POLICY "Admins can delete signals" ON public.signals FOR DELETE TO authenticated USING (is_admin_of_org(auth.uid(), org_id));

-- pods
DROP POLICY IF EXISTS "Org members can view pods" ON public.pods;
DROP POLICY IF EXISTS "Admins can insert pods" ON public.pods;
DROP POLICY IF EXISTS "Admins can update pods" ON public.pods;
DROP POLICY IF EXISTS "Admins can delete pods" ON public.pods;

CREATE POLICY "Org members can view pods" ON public.pods FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins can insert pods" ON public.pods FOR INSERT TO authenticated WITH CHECK (is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Admins can update pods" ON public.pods FOR UPDATE TO authenticated USING (is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Admins can delete pods" ON public.pods FOR DELETE TO authenticated USING (is_admin_of_org(auth.uid(), org_id));

-- pod_initiatives
DROP POLICY IF EXISTS "Org members can view pod initiatives" ON public.pod_initiatives;
DROP POLICY IF EXISTS "Admins can insert pod initiatives" ON public.pod_initiatives;
DROP POLICY IF EXISTS "Admins can update pod initiatives" ON public.pod_initiatives;
DROP POLICY IF EXISTS "Admins can delete pod initiatives" ON public.pod_initiatives;

CREATE POLICY "Org members can view pod initiatives" ON public.pod_initiatives FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM pods p WHERE p.id = pod_initiatives.pod_id AND is_org_member(auth.uid(), p.org_id)));
CREATE POLICY "Admins can insert pod initiatives" ON public.pod_initiatives FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM pods p WHERE p.id = pod_initiatives.pod_id AND is_admin_of_org(auth.uid(), p.org_id)));
CREATE POLICY "Admins can update pod initiatives" ON public.pod_initiatives FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM pods p WHERE p.id = pod_initiatives.pod_id AND is_admin_of_org(auth.uid(), p.org_id)));
CREATE POLICY "Admins can delete pod initiatives" ON public.pod_initiatives FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM pods p WHERE p.id = pod_initiatives.pod_id AND is_admin_of_org(auth.uid(), p.org_id)));

-- closed_decisions
DROP POLICY IF EXISTS "Org members can view closed decisions" ON public.closed_decisions;
DROP POLICY IF EXISTS "Admins and pod leads can insert closed decisions" ON public.closed_decisions;
DROP POLICY IF EXISTS "Admins can delete closed decisions" ON public.closed_decisions;

CREATE POLICY "Org members can view closed decisions" ON public.closed_decisions FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins and pod leads can insert closed decisions" ON public.closed_decisions FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id) AND (get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])));
CREATE POLICY "Admins can delete closed decisions" ON public.closed_decisions FOR DELETE TO authenticated USING (is_admin_of_org(auth.uid(), org_id));

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
