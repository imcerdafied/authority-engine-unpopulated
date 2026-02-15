
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'pod_lead', 'viewer');

-- Create solution type enum
CREATE TYPE public.solution_type AS ENUM ('S1', 'S2', 'S3', 'Cross-Solution');

-- Create impact tier enum
CREATE TYPE public.impact_tier AS ENUM ('High', 'Medium', 'Low');

-- Create decision status enum
CREATE TYPE public.decision_status AS ENUM ('Draft', 'Active', 'Blocked', 'Closed');

-- Create decision health enum
CREATE TYPE public.decision_health AS ENUM ('On Track', 'At Risk', 'Degrading');

-- Create signal type enum
CREATE TYPE public.signal_type AS ENUM ('KPI Deviation', 'Segment Variance', 'Agent Drift', 'Exec Escalation', 'Launch Milestone', 'Renewal Risk', 'Cross-Solution Conflict');

-- Create outcome category enum
CREATE TYPE public.outcome_category AS ENUM ('Revenue', 'Retention', 'Conversion', 'Trust', 'Agent Performance', 'Efficiency', 'Enterprise Renewal', 'Platform Adoption', 'Agent Trust', 'QoE Risk', 'Executive Credibility');

-- Create prediction accuracy enum
CREATE TYPE public.prediction_accuracy AS ENUM ('Accurate', 'Partial', 'Missed');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization memberships (roles stored here, not on profiles)
CREATE TABLE public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of org (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Helper: get user role in org
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.organization_memberships
  WHERE user_id = _user_id AND org_id = _org_id
  LIMIT 1
$$;

-- Helper: check if user is admin of org
CREATE OR REPLACE FUNCTION public.is_admin_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND org_id = _org_id AND role = 'admin'
  )
$$;

-- RLS for organizations: members can see their orgs
CREATE POLICY "Members can view their orgs" ON public.organizations
  FOR SELECT USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update orgs" ON public.organizations
  FOR UPDATE USING (public.is_admin_of_org(auth.uid(), id));

-- RLS for organization_memberships
CREATE POLICY "Members can view memberships in their org" ON public.organization_memberships
  FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins can insert memberships" ON public.organization_memberships
  FOR INSERT WITH CHECK (public.is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Admins can update memberships" ON public.organization_memberships
  FOR UPDATE USING (public.is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Admins can delete memberships" ON public.organization_memberships
  FOR DELETE USING (public.is_admin_of_org(auth.uid(), org_id));
-- Allow creator to self-insert as admin when creating org
CREATE POLICY "Creator can self-insert membership" ON public.organization_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM public.organization_memberships WHERE org_id = organization_memberships.org_id
  ));

-- Decisions table (org-scoped)
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  trigger_signal TEXT,
  outcome_target TEXT,
  outcome_category outcome_category,
  expected_impact TEXT,
  current_delta TEXT,
  revenue_at_risk TEXT,
  impact_tier impact_tier NOT NULL DEFAULT 'Medium',
  segment_impact TEXT,
  owner TEXT NOT NULL,
  status decision_status NOT NULL DEFAULT 'Draft',
  slice_deadline_days INTEGER DEFAULT 10,
  shipped_slice_date TEXT,
  measured_outcome_result TEXT,
  blocked_reason TEXT,
  blocked_dependency_owner TEXT,
  solution_type solution_type NOT NULL,
  surface TEXT NOT NULL,
  decision_health decision_health,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view decisions" ON public.decisions
  FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins can insert decisions" ON public.decisions
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND (
    public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  ));
CREATE POLICY "Admins and pod leads can update decisions" ON public.decisions
  FOR UPDATE USING (public.is_org_member(auth.uid(), org_id) AND (
    public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  ));
CREATE POLICY "Admins can delete decisions" ON public.decisions
  FOR DELETE USING (public.is_admin_of_org(auth.uid(), org_id));

-- Signals table (org-scoped)
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type signal_type NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  decision_id UUID REFERENCES public.decisions(id),
  solution_type solution_type,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view signals" ON public.signals
  FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins and pod leads can insert signals" ON public.signals
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND (
    public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  ));
CREATE POLICY "Admins and pod leads can update signals" ON public.signals
  FOR UPDATE USING (public.is_org_member(auth.uid(), org_id) AND (
    public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  ));
CREATE POLICY "Admins can delete signals" ON public.signals
  FOR DELETE USING (public.is_admin_of_org(auth.uid(), org_id));

-- Pods table (org-scoped)
CREATE TABLE public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  solution_type solution_type NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view pods" ON public.pods
  FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins can insert pods" ON public.pods
  FOR INSERT WITH CHECK (public.is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Admins can update pods" ON public.pods
  FOR UPDATE USING (public.is_admin_of_org(auth.uid(), org_id));
CREATE POLICY "Admins can delete pods" ON public.pods
  FOR DELETE USING (public.is_admin_of_org(auth.uid(), org_id));

-- Pod initiatives table
CREATE TABLE public.pod_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  last_demo_date TEXT,
  slice_deadline TEXT NOT NULL,
  outcome_linked BOOLEAN NOT NULL DEFAULT false,
  shipped BOOLEAN NOT NULL DEFAULT false,
  renewal_aligned BOOLEAN DEFAULT false,
  cross_solution_dep TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pod_initiatives ENABLE ROW LEVEL SECURITY;
-- RLS via pod's org
CREATE POLICY "Org members can view pod initiatives" ON public.pod_initiatives
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_org_member(auth.uid(), p.org_id)
  ));
CREATE POLICY "Admins can insert pod initiatives" ON public.pod_initiatives
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_admin_of_org(auth.uid(), p.org_id)
  ));
CREATE POLICY "Admins can update pod initiatives" ON public.pod_initiatives
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_admin_of_org(auth.uid(), p.org_id)
  ));
CREATE POLICY "Admins can delete pod initiatives" ON public.pod_initiatives
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.pods p WHERE p.id = pod_initiatives.pod_id AND public.is_admin_of_org(auth.uid(), p.org_id)
  ));

-- Closed decisions table (org-scoped)
CREATE TABLE public.closed_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.decisions(id),
  title TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  actual_result TEXT NOT NULL,
  segment_shift TEXT,
  agent_impact TEXT,
  notes TEXT NOT NULL DEFAULT '',
  closed_date TEXT NOT NULL,
  solution_type solution_type NOT NULL,
  renewal_impact TEXT,
  prediction_accuracy prediction_accuracy NOT NULL DEFAULT 'Partial',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.closed_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view closed decisions" ON public.closed_decisions
  FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins and pod leads can insert closed decisions" ON public.closed_decisions
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND (
    public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  ));
CREATE POLICY "Admins can delete closed decisions" ON public.closed_decisions
  FOR DELETE USING (public.is_admin_of_org(auth.uid(), org_id));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on decisions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
