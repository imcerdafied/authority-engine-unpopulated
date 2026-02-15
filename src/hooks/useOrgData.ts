import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useDecisions() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["decisions", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("decisions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
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
