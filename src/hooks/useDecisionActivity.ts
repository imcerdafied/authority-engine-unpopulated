import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";

export function useDecisionActivity(decisionId: string) {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["decision_activity", decisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_activity")
        .select("*")
        .eq("decision_id", decisionId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
    },
    enabled: !!currentOrg && !!decisionId,
  });
}

export function useLogActivity() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (decisionId: string, fieldName: string, oldValue: string | null, newValue: string | null) => {
    if (!currentOrg || !user || oldValue === newValue) return;
    await supabase.from("decision_activity").insert({
      decision_id: decisionId,
      org_id: currentOrg.id,
      field_name: fieldName,
      old_value: oldValue || null,
      new_value: newValue || null,
      changed_by: user.id,
    } as any);
    qc.invalidateQueries({ queryKey: ["decision_activity", decisionId] });
  };
}
