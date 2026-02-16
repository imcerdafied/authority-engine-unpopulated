-- decision_risk: AI-computed risk per decision (org_id + decision_id)
CREATE TABLE IF NOT EXISTS public.decision_risk (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  risk_score integer NOT NULL DEFAULT 0,
  risk_indicator text NOT NULL DEFAULT 'Green' CHECK (risk_indicator IN ('Green', 'Yellow', 'Red')),
  risk_reason text,
  risk_source text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, decision_id)
);

ALTER TABLE public.decision_risk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decision risk"
  ON public.decision_risk FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_decision_risk_org_id ON public.decision_risk(org_id);
