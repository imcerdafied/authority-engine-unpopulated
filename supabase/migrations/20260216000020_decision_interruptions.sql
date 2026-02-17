-- decision_interruptions: log capacity diverted by interrupts
CREATE TABLE IF NOT EXISTS public.decision_interruptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  description text NOT NULL,
  source text NOT NULL CHECK (source IN ('ad_hoc', 'escalation', 'deal_request', 'support', 'executive_override')),
  engineers_diverted integer NOT NULL DEFAULT 0 CHECK (engineers_diverted >= 0),
  estimated_days integer NOT NULL DEFAULT 0 CHECK (estimated_days >= 0),
  impact_note text,
  logged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_interruptions_org ON public.decision_interruptions(org_id);
CREATE INDEX IF NOT EXISTS idx_decision_interruptions_decision ON public.decision_interruptions(decision_id);

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS capacity_allocated integer DEFAULT 0 CHECK (capacity_allocated >= 0 AND capacity_allocated <= 100),
  ADD COLUMN IF NOT EXISTS capacity_diverted integer DEFAULT 0 CHECK (capacity_diverted >= 0 AND capacity_diverted <= 100),
  ADD COLUMN IF NOT EXISTS unplanned_interrupts integer DEFAULT 0 CHECK (unplanned_interrupts >= 0),
  ADD COLUMN IF NOT EXISTS escalation_count integer DEFAULT 0 CHECK (escalation_count >= 0),
  ADD COLUMN IF NOT EXISTS previous_exposure_value text;

-- RLS for decision_interruptions
ALTER TABLE public.decision_interruptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view decision_interruptions" ON public.decision_interruptions
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins and pod leads can insert decision_interruptions" ON public.decision_interruptions
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), org_id) AND (public.get_user_role_in_org(auth.uid(), org_id) = ANY (ARRAY['admin'::app_role, 'pod_lead'::app_role])));
