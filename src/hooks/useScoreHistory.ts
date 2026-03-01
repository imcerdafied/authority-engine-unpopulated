import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { ScoreHistoryEntry } from "@/lib/types";

export function useScoreHistory(betId: string | undefined) {
  const { currentOrg } = useOrg();
  return useQuery<ScoreHistoryEntry[]>({
    queryKey: ["score_history", betId],
    queryFn: async () => {
      if (!currentOrg || !betId) return [];
      const { data, error } = await supabase
        .from("score_history")
        .select("*")
        .eq("bet_id", betId)
        .order("calculated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as ScoreHistoryEntry[];
    },
    enabled: !!currentOrg && !!betId,
  });
}
