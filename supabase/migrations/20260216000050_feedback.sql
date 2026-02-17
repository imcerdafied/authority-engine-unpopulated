-- feedback: user-submitted feedback (bugs, suggestions, questions)
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  page text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'suggestion', 'question')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_org ON public.feedback(org_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Org members can insert feedback for their org
CREATE POLICY "Org members can insert feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- Only admins can view feedback for their org
CREATE POLICY "Admins can view feedback" ON public.feedback
  FOR SELECT TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));
