import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import type { TablesInsert } from "@/integrations/supabase/types";

export interface DecisionComputed {
  id: string;
  org_id: string;
  title: string;
  surface: string;
  owner: string;
  owner_user_id: string | null;
  status: string;
  impact_tier: string;
  solution_domain: string;
  trigger_signal: string | null;
  outcome_target: string | null;
  outcome_category: string | null;
  outcome_category_key: string | null;
  expected_impact: string | null;
  current_delta: string | null;
  revenue_at_risk: string | null;
  segment_impact: string | null;
  decision_health: string | null;
  blocked_reason: string | null;
  blocked_dependency_owner: string | null;
  slice_deadline_days: number | null;
  slice_due_at: string | null;
  shipped_slice_date: string | null;
  measured_outcome_result: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  activated_at: string | null;
  exposure_value: string | null;
  // Client-computed fields
  age_days: number;
  slice_remaining: number;
  is_exceeded: boolean;
  is_urgent: boolean;
  is_aging: boolean;
  is_unbound: boolean;
  needs_exec_attention: boolean;
}

function computeDecisionFields(row: Record<string, unknown>): DecisionComputed {
  const created = new Date((row.created_at as string) || 0).getTime();
  const now = Date.now();
  const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  const sliceDeadline = (row.slice_deadline_days as number) ?? 10;
  const sliceDueAt = row.slice_due_at as string | null;
  let sliceRemaining: number;
  if (sliceDueAt) {
    sliceRemaining = Math.floor((new Date(sliceDueAt).getTime() - now) / (1000 * 60 * 60 * 24));
  } else {
    sliceRemaining = sliceDeadline - ageDays;
  }
  const isActive = (row.status as string)?.toLowerCase() !== "closed";
  const isExceeded = isActive && (sliceDueAt ? now > new Date(sliceDueAt).getTime() : ageDays > sliceDeadline);
  const isUrgent = isActive && sliceRemaining >= 0 && sliceRemaining <= 3;
  const isAging = isActive && ageDays > 14;
  const isUnbound = isActive && !row.outcome_target;
  const needsExecAttention = (row.status === "Blocked" || row.status === "blocked") && ageDays > 7;

  return {
    ...row,
    id: row.id as string,
    org_id: row.org_id as string,
    title: row.title as string,
    surface: row.surface as string,
    owner: row.owner as string,
    owner_user_id: (row.owner_user_id as string) ?? null,
    status: row.status as string,
    impact_tier: row.impact_tier as string,
    solution_domain: row.solution_domain as string,
    trigger_signal: (row.trigger_signal as string) ?? null,
    outcome_target: (row.outcome_target as string) ?? null,
    outcome_category: (row.outcome_category as string) ?? null,
    outcome_category_key: (row.outcome_category_key as string) ?? null,
    expected_impact: (row.expected_impact as string) ?? null,
    current_delta: (row.current_delta as string) ?? null,
    revenue_at_risk: (row.revenue_at_risk as string) ?? null,
    segment_impact: (row.segment_impact as string) ?? null,
    decision_health: (row.decision_health as string) ?? null,
    blocked_reason: (row.blocked_reason as string) ?? null,
    blocked_dependency_owner: (row.blocked_dependency_owner as string) ?? null,
    slice_deadline_days: (row.slice_deadline_days as number) ?? null,
    slice_due_at: (row.slice_due_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    created_by: (row.created_by as string) ?? null,
    activated_at: (row.activated_at as string) ?? null,
    exposure_value: (row.exposure_value as string) ?? null,
    age_days: ageDays,
    slice_remaining: sliceRemaining,
    is_exceeded: isExceeded,
    is_urgent: isUrgent,
    is_aging: isAging,
    is_unbound: isUnbound,
    needs_exec_attention: needsExecAttention,
  } as DecisionComputed;
}

export function useDecisions() {
  const { currentOrg } = useOrg();
  return useQuery<DecisionComputed[]>({
    queryKey: ["decisions", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("decisions")
        .select("id, org_id, title, owner, owner_user_id, surface, solution_domain, impact_tier, outcome_target, outcome_category_key, expected_impact, exposure_value, trigger_signal, revenue_at_risk, status, created_at, updated_at, outcome_category, current_delta, segment_impact, decision_health, blocked_reason, blocked_dependency_owner, slice_deadline_days, slice_due_at, activated_at, created_by, shipped_slice_date, measured_outcome_result, capacity_allocated, capacity_diverted, unplanned_interrupts, escalation_count, previous_exposure_value, state_changed_at, state_change_note, pod_configuration")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as Record<string, unknown>[];
      const computed = rows.map(computeDecisionFields);
      const statusOrder = { active: 0, accepted: 1, rejected: 2, archived: 3 };
      const tierOrder = { High: 3, Medium: 2, Low: 1 };
      return computed.sort((a, b) => {
        const sa = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
        const sb = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
        if (sa !== sb) return sa - sb;
        const ta = tierOrder[a.impact_tier as keyof typeof tierOrder] ?? 0;
        const tb = tierOrder[b.impact_tier as keyof typeof tierOrder] ?? 0;
        if (tb !== ta) return tb - ta;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
    enabled: !!currentOrg,
  });
}

export function useCreateDecision() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"decisions">, "org_id" | "created_by">) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("decisions")
        .insert({ ...input, org_id: currentOrg.id, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions", currentOrg?.id] }),
  });
}

export function useUpdateDecision() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"decisions">>) => {
      const { data, error } = await supabase
        .from("decisions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions", currentOrg?.id] }),
  });
}

export function useDeleteDecision() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("decisions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions", currentOrg?.id] }),
  });
}

export function useSignals() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["signals", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg,
  });
}

export function useCreateSignal() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"signals">, "org_id" | "created_by">) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("signals")
        .insert({ ...input, org_id: currentOrg.id, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals", currentOrg?.id] }),
  });
}

export function useDeleteSignal() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("signals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals", currentOrg?.id] }),
  });
}

export function usePods() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["pods", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("pods")
        .select("*, pod_initiatives(*)")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg,
  });
}

export function useCreatePod() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"pods">, "org_id" | "created_by">) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("pods")
        .insert({ ...input, org_id: currentOrg.id, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pods", currentOrg?.id] }),
  });
}

export function useDeletePod() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pods", currentOrg?.id] }),
  });
}

export function useCreatePodInitiative() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (input: TablesInsert<"pod_initiatives">) => {
      const { data, error } = await supabase
        .from("pod_initiatives")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pods", currentOrg?.id] }),
  });
}

export function useClosedDecisions() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["closed_decisions", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("closed_decisions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg,
  });
}

export interface OverviewMetrics {
  active_high_impact: number;
  blocked_gt5_days: number;
  unlinked_signals: number;
  decision_latency_days: number;
  overdue_slices: number;
  total_active: number;
  blocked_count: number;
  friction_score: number;
  friction_level: string;
  friction_drivers: string[];
  at_capacity: boolean;
}

export function useOverviewMetrics() {
  const { currentOrg } = useOrg();
  return useQuery<OverviewMetrics>({
    queryKey: ["overview_metrics", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) throw new Error("No org");
      const { data, error } = await supabase.rpc("get_overview_metrics", {
        _org_id: currentOrg.id,
      });
      if (error) throw error;
      return data as unknown as OverviewMetrics;
    },
    enabled: !!currentOrg,
  });
}

export interface DecisionRisk {
  decision_id: string;
  org_id: string;
  risk_score: number;
  risk_indicator: "Green" | "Yellow" | "Red";
}

export function useDecisionRisks() {
  const { currentOrg } = useOrg();
  return useQuery<DecisionRisk[]>({
    queryKey: ["decision_risks", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("decision_risk" as any)
        .select("org_id, decision_id, risk_score, risk_indicator")
        .eq("org_id", currentOrg.id);
      if (error) return [];
      return (data || []) as unknown as DecisionRisk[];
    },
    enabled: !!currentOrg,
  });
}
