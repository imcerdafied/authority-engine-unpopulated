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
  status: string;
  impact_tier: string;
  solution_domain: string;
  trigger_signal: string | null;
  outcome_target: string | null;
  outcome_category: string | null;
  expected_impact: string | null;
  current_delta: string | null;
  revenue_at_risk: string | null;
  segment_impact: string | null;
  decision_health: string | null;
  blocked_reason: string | null;
  blocked_dependency_owner: string | null;
  slice_deadline_days: number | null;
  shipped_slice_date: string | null;
  measured_outcome_result: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Server-computed fields
  age_days: number;
  slice_remaining: number;
  is_exceeded: boolean;
  is_urgent: boolean;
  is_aging: boolean;
  is_unbound: boolean;
  needs_exec_attention: boolean;
}

export function useDecisions() {
  const { currentOrg } = useOrg();
  return useQuery<DecisionComputed[]>({
    queryKey: ["decisions", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("decisions_computed" as any)
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DecisionComputed[];
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
