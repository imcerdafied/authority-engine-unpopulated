
-- Allow org creators to see their org (needed for the insert...select pattern before membership is created)
DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
CREATE POLICY "Members can view their orgs" ON public.organizations 
  FOR SELECT TO authenticated 
  USING (is_org_member(auth.uid(), id) OR auth.uid() = created_by);
