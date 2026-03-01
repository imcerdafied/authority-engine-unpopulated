import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { BetMetric } from "@/lib/types";
import { defineMetric } from "@/lib/metric-substrate/defineMetric";
import { updateMetricValue } from "@/lib/metric-substrate/updateMetricValue";

export function useMetrics(betId: string | undefined) {
  const { currentOrg } = useOrg();
  return useQuery<BetMetric[]>({
    queryKey: ["bet_metrics", betId],
    queryFn: async () => {
      if (!currentOrg || !betId) return [];
      const { data, error } = await supabase
        .from("bet_metrics")
        .select("*")
        .eq("bet_id", betId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as BetMetric[];
    },
    enabled: !!currentOrg && !!betId,
  });
}

export function useAddMetric(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      outcome_key: string;
      metric_name: string;
      target_value: number;
    }) => {
      if (!betId) throw new Error("No betId");
      return defineMetric({ bet_id: betId, ...input }, supabase);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bet_metrics", betId] });
    },
  });
}

export function useUpdateMetricValue(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ metricId, newValue }: { metricId: string; newValue: number }) => {
      return updateMetricValue(metricId, newValue, supabase);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bet_metrics", betId] });
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}
