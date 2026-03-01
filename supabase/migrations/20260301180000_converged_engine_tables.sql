-- Converged Engine Foundation Tables
-- Adds outcome-conditioned execution intelligence and metric tracking
-- All tables FK to decisions(id) and derive org access through the parent decision.

-- ══════════════════════════════════════════════════════════════════════
-- 1. bet_metrics — embedded TrueNorth metric tracking
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.bet_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  outcome_key text NOT NULL,
  metric_name text NOT NULL,
  target_value float8 NOT NULL,
  current_value float8 NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OnTrack'
    CHECK (status IN ('OnTrack', 'AtRisk', 'OffTrack')),
  created_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 2. bet_initiatives — scored & ranked initiatives per bet
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.bet_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  description text NOT NULL,
  aligned_outcomes jsonb NOT NULL DEFAULT '[]',
  value float8 NOT NULL DEFAULT 5,
  confidence float8 NOT NULL DEFAULT 0.5,
  effort float8 NOT NULL DEFAULT 5,
  outcome_multiplier float8 NOT NULL DEFAULT 1.0,
  score_v3 float8 NOT NULL DEFAULT 0,
  roadmap_position integer NOT NULL DEFAULT 0,
  last_score_delta float8 NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 3. bet_findings — research findings aligned to outcomes
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.bet_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  description text NOT NULL,
  aligned_outcomes jsonb NOT NULL DEFAULT '[]',
  value float8 NOT NULL DEFAULT 5,
  confidence float8 NOT NULL DEFAULT 0.5,
  effort float8 NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 4. bet_monitoring — drift detection state per bet
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.bet_monitoring (
  bet_id uuid PRIMARY KEY REFERENCES public.decisions(id) ON DELETE CASCADE,
  drift_flags jsonb NOT NULL DEFAULT '[]',
  last_recalculated_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 5. score_history — "What Moved" log for explainability
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.bet_initiatives(id) ON DELETE CASCADE,
  bet_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  previous_score float8 NOT NULL,
  new_score float8 NOT NULL,
  previous_rank integer NOT NULL,
  new_rank integer NOT NULL,
  trigger_event text NOT NULL,
  calculated_at timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════════════
CREATE INDEX idx_bet_metrics_bet_id ON public.bet_metrics(bet_id);
CREATE INDEX idx_bet_initiatives_bet_id ON public.bet_initiatives(bet_id);
CREATE INDEX idx_bet_initiatives_bet_score ON public.bet_initiatives(bet_id, score_v3 DESC);
CREATE INDEX idx_bet_findings_bet_id ON public.bet_findings(bet_id);
CREATE INDEX idx_score_history_bet_timeline ON public.score_history(bet_id, calculated_at DESC);
CREATE INDEX idx_score_history_initiative ON public.score_history(initiative_id);


-- ══════════════════════════════════════════════════════════════════════
-- RLS — enable on all tables
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.bet_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════
-- RLS Policies — bet_metrics
-- Access derived through parent decision's org_id
-- ══════════════════════════════════════════════════════════════════════
CREATE POLICY "Members can view bet_metrics" ON public.bet_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_metrics.bet_id
        AND public.is_org_member(auth.uid(), d.org_id)
    )
  );

CREATE POLICY "Admins and pod leads can insert bet_metrics" ON public.bet_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_metrics.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins and pod leads can update bet_metrics" ON public.bet_metrics
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_metrics.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_metrics.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins can delete bet_metrics" ON public.bet_metrics
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_metrics.bet_id
        AND public.is_admin_of_org(auth.uid(), d.org_id)
    )
  );


-- ══════════════════════════════════════════════════════════════════════
-- RLS Policies — bet_initiatives
-- ══════════════════════════════════════════════════════════════════════
CREATE POLICY "Members can view bet_initiatives" ON public.bet_initiatives
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_initiatives.bet_id
        AND public.is_org_member(auth.uid(), d.org_id)
    )
  );

CREATE POLICY "Admins and pod leads can insert bet_initiatives" ON public.bet_initiatives
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_initiatives.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins and pod leads can update bet_initiatives" ON public.bet_initiatives
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_initiatives.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_initiatives.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins can delete bet_initiatives" ON public.bet_initiatives
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_initiatives.bet_id
        AND public.is_admin_of_org(auth.uid(), d.org_id)
    )
  );


-- ══════════════════════════════════════════════════════════════════════
-- RLS Policies — bet_findings
-- ══════════════════════════════════════════════════════════════════════
CREATE POLICY "Members can view bet_findings" ON public.bet_findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_findings.bet_id
        AND public.is_org_member(auth.uid(), d.org_id)
    )
  );

CREATE POLICY "Admins and pod leads can insert bet_findings" ON public.bet_findings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_findings.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins and pod leads can update bet_findings" ON public.bet_findings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_findings.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_findings.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins can delete bet_findings" ON public.bet_findings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_findings.bet_id
        AND public.is_admin_of_org(auth.uid(), d.org_id)
    )
  );


-- ══════════════════════════════════════════════════════════════════════
-- RLS Policies — bet_monitoring
-- ══════════════════════════════════════════════════════════════════════
CREATE POLICY "Members can view bet_monitoring" ON public.bet_monitoring
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_monitoring.bet_id
        AND public.is_org_member(auth.uid(), d.org_id)
    )
  );

CREATE POLICY "Admins and pod leads can insert bet_monitoring" ON public.bet_monitoring
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_monitoring.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins and pod leads can update bet_monitoring" ON public.bet_monitoring
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_monitoring.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = bet_monitoring.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins can delete bet_monitoring" ON public.bet_monitoring
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = bet_monitoring.bet_id
        AND public.is_admin_of_org(auth.uid(), d.org_id)
    )
  );


-- ══════════════════════════════════════════════════════════════════════
-- RLS Policies — score_history
-- ══════════════════════════════════════════════════════════════════════
CREATE POLICY "Members can view score_history" ON public.score_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = score_history.bet_id
        AND public.is_org_member(auth.uid(), d.org_id)
    )
  );

CREATE POLICY "Admins and pod leads can insert score_history" ON public.score_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.organization_memberships om ON om.org_id = d.org_id
      WHERE d.id = score_history.bet_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'pod_lead')
    )
  );

CREATE POLICY "Admins can delete score_history" ON public.score_history
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = score_history.bet_id
        AND public.is_admin_of_org(auth.uid(), d.org_id)
    )
  );
