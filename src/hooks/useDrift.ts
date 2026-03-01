import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { BetMonitoring, DriftFlag } from "@/lib/types";

export function useDrift(betId: string | undefined) {
  const { currentOrg } = useOrg();
  const query = useQuery<BetMonitoring | null>({
    queryKey: ["bet_monitoring", betId],
    queryFn: async () => {
      if (!currentOrg || !betId) return null;
      const { data, error } = await supabase
        .from("bet_monitoring")
        .select("*")
        .eq("bet_id", betId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        bet_id: data.bet_id,
        drift_flags: (data.drift_flags ?? []) as DriftFlag[],
        last_recalculated_at: data.last_recalculated_at,
      } as BetMonitoring;
    },
    enabled: !!currentOrg && !!betId,
  });

  return {
    driftFlags: query.data?.drift_flags ?? [],
    lastRecalculatedAt: query.data?.last_recalculated_at ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
