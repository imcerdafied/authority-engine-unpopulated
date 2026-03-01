-- Repair decisions write policies with direct membership checks.
-- This avoids helper-function drift causing false RLS denies on updates.

ALTER TABLE IF EXISTS public.decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and pod leads can insert decisions" ON public.decisions;
CREATE POLICY "Admins and pod leads can insert decisions"
ON public.decisions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.org_id = decisions.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'pod_lead')
  )
);

DROP POLICY IF EXISTS "Admins and pod leads can update decisions" ON public.decisions;
CREATE POLICY "Admins and pod leads can update decisions"
ON public.decisions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.org_id = decisions.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'pod_lead')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.org_id = decisions.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'pod_lead')
  )
);

