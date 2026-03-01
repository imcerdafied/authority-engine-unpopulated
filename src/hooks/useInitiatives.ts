import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { BetInitiative } from "@/lib/types";
import { recalculateBetState } from "@/lib/outcome-engine/recalculateBetState";

export function useInitiatives(betId: string | undefined) {
  const { currentOrg } = useOrg();
  return useQuery<BetInitiative[]>({
    queryKey: ["bet_initiatives", betId],
    queryFn: async () => {
      if (!currentOrg || !betId) return [];
      const { data, error } = await supabase
        .from("bet_initiatives")
        .select("*")
        .eq("bet_id", betId)
        .order("roadmap_position", { ascending: true });
      if (error) throw error;
      return (data || []) as BetInitiative[];
    },
    enabled: !!currentOrg && !!betId,
  });
}

export function useAddInitiative(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      description: string;
      aligned_outcomes?: string[];
      value?: number;
      confidence?: number;
      effort?: number;
    }) => {
      if (!betId) throw new Error("No betId");
      const { error } = await supabase.from("bet_initiatives").insert({
        bet_id: betId,
        description: input.description,
        aligned_outcomes: input.aligned_outcomes ?? [],
        value: input.value ?? 5,
        confidence: input.confidence ?? 0.5,
        effort: input.effort ?? 5,
      });
      if (error) throw error;
      await recalculateBetState(betId, "INITIATIVE_ADDED", supabase);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}

export function useUpdateInitiative(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BetInitiative> & { id: string }) => {
      if (!betId) throw new Error("No betId");
      const { error } = await supabase
        .from("bet_initiatives")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      await recalculateBetState(betId, "INITIATIVE_UPDATED", supabase);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}

export function useDeleteInitiative(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!betId) throw new Error("No betId");
      const { error } = await supabase.from("bet_initiatives").delete().eq("id", id);
      if (error) throw error;
      await recalculateBetState(betId, "INITIATIVE_DELETED", supabase);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}
