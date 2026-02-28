-- Ensure authenticated org members can read decisions after RLS re-enable.
-- Safe/idempotent repair for missing policies.

ALTER TABLE IF EXISTS public.decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view decisions in org" ON public.decisions;
CREATE POLICY "Members can view decisions in org"
ON public.decisions
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins and pod leads can insert decisions" ON public.decisions;
CREATE POLICY "Admins and pod leads can insert decisions"
ON public.decisions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_member(auth.uid(), org_id)
  AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
);

DROP POLICY IF EXISTS "Admins and pod leads can update decisions" ON public.decisions;
CREATE POLICY "Admins and pod leads can update decisions"
ON public.decisions
FOR UPDATE
TO authenticated
USING (
  public.is_org_member(auth.uid(), org_id)
  AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
)
WITH CHECK (
  public.is_org_member(auth.uid(), org_id)
  AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
);

