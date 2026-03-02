import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { BetMetric } from "@/lib/types";
import { defineMetric } from "@/lib/metric-substrate/defineMetric";
import { updateMetricValue } from "@/lib/metric-substrate/updateMetricValue";
import { calculateMetricStatus } from "@/lib/metric-substrate/calculateMetricStatus";

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
    // Optimistic: show new value and progress bar immediately
    onMutate: async ({ metricId, newValue }) => {
      await qc.cancelQueries({ queryKey: ["bet_metrics", betId] });
      const previous = qc.getQueryData<BetMetric[]>(["bet_metrics", betId]);
      if (previous) {
        qc.setQueryData<BetMetric[]>(["bet_metrics", betId], (old) =>
          (old ?? []).map((m) => {
            if (m.id !== metricId) return m;
            const newStatus = calculateMetricStatus(newValue, m.target_value);
            return { ...m, current_value: newValue, status: newStatus };
          }),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["bet_metrics", betId], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bet_metrics", betId] });
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}
