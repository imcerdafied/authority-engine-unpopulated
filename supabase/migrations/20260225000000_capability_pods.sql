-- Capability Pods: execution units explicitly mapped to strategic bets
-- Each pod has a required primary bet and optional secondary bet.

-- 1. Status enum
CREATE TYPE public.capability_pod_status AS ENUM (
  'proposed',
  'prototyping',
  'validated',
  'building',
  'in_production',
  'paused'
);

-- 2. Main table
CREATE TABLE public.capability_pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  primary_bet_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  secondary_bet_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
  owner TEXT NOT NULL,
  status public.capability_pod_status NOT NULL DEFAULT 'proposed',
  deliverable TEXT,
  kpi_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  prototype_built BOOLEAN NOT NULL DEFAULT false,
  customer_validated BOOLEAN NOT NULL DEFAULT false,
  production_shipped BOOLEAN NOT NULL DEFAULT false,
  cycle_time_days INTEGER,
  dependencies JSONB NOT NULL DEFAULT '{"shared_primitive": false, "notes": "", "blocking_pods": []}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT capability_pods_secondary_differs
    CHECK (secondary_bet_id IS NULL OR secondary_bet_id != primary_bet_id),
  CONSTRAINT capability_pods_production_gate
    CHECK (status != 'in_production' OR (prototype_built = true AND customer_validated = true))
);

-- 3. Indexes
CREATE INDEX capability_pods_org_id_idx ON public.capability_pods(org_id);
CREATE INDEX capability_pods_primary_bet_idx ON public.capability_pods(primary_bet_id);
CREATE INDEX capability_pods_secondary_bet_idx ON public.capability_pods(secondary_bet_id);
CREATE INDEX capability_pods_status_idx ON public.capability_pods(status);
CREATE INDEX capability_pods_owner_idx ON public.capability_pods(owner);

-- 4. updated_at trigger (reuses existing function)
CREATE TRIGGER update_capability_pods_updated_at
  BEFORE UPDATE ON public.capability_pods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Production gate trigger (provides clear error message)
CREATE OR REPLACE FUNCTION public.enforce_capability_pod_production_gate()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_production' AND (NEW.prototype_built = false OR NEW.customer_validated = false) THEN
    RAISE EXCEPTION 'Cannot set status to in_production: prototype_built and customer_validated must both be true';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER capability_pods_production_gate_trigger
  BEFORE INSERT OR UPDATE ON public.capability_pods
  FOR EACH ROW EXECUTE FUNCTION public.enforce_capability_pod_production_gate();

-- 6. RLS
ALTER TABLE public.capability_pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view capability_pods"
  ON public.capability_pods FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Admins and pod leads can insert capability_pods"
  ON public.capability_pods FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id)
    AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  );

CREATE POLICY "Admins and pod leads can update capability_pods"
  ON public.capability_pods FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id)
    AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  );

CREATE POLICY "Admins can delete capability_pods"
  ON public.capability_pods FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), org_id));

-- 7. Activity log table
CREATE TABLE public.capability_pod_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES public.capability_pods(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX capability_pod_events_pod_id_idx ON public.capability_pod_events(pod_id);
CREATE INDEX capability_pod_events_created_at_idx ON public.capability_pod_events(created_at DESC);

ALTER TABLE public.capability_pod_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view capability_pod_events"
  ON public.capability_pod_events FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Writers can insert capability_pod_events"
  ON public.capability_pod_events FOR INSERT TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND public.is_org_member(auth.uid(), org_id)
    AND public.get_user_role_in_org(auth.uid(), org_id) IN ('admin', 'pod_lead')
  );
