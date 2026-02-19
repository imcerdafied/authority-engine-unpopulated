-- Enforce tenant isolation on decision_activity
ALTER TABLE public.decision_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view decision_activity" ON public.decision_activity;
CREATE POLICY "Org members can view decision_activity"
  ON public.decision_activity
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.org_id = decision_activity.org_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and pod leads can insert decision_activity" ON public.decision_activity;
CREATE POLICY "Admins and pod leads can insert decision_activity"
  ON public.decision_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.org_id = decision_activity.org_id
        AND om.user_id = auth.uid()
        AND om.role::text IN ('admin', 'pod_lead')
    )
  );
