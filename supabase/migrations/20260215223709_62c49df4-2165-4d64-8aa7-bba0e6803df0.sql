
-- Table to persist AI projections per decision
CREATE TABLE public.decision_projections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  scenarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_metadata_hash text NOT NULL DEFAULT '',
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decision_projections ENABLE ROW LEVEL SECURITY;

-- Org members can view projections
CREATE POLICY "Org members can view projections"
  ON public.decision_projections
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

-- Admins and pod leads can insert projections
CREATE POLICY "Admins and pod leads can insert projections"
  ON public.decision_projections
  FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), org_id)
    AND get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])
  );

-- Admins and pod leads can update projections
CREATE POLICY "Admins and pod leads can update projections"
  ON public.decision_projections
  FOR UPDATE
  USING (
    is_org_member(auth.uid(), org_id)
    AND get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])
  );

-- Admins can delete projections
CREATE POLICY "Admins can delete projections"
  ON public.decision_projections
  FOR DELETE
  USING (is_admin_of_org(auth.uid(), org_id));

-- Index for fast lookup by decision
CREATE INDEX idx_decision_projections_decision_id ON public.decision_projections(decision_id);
