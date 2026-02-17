import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";

export function useInterruptions(decisionId?: string) {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["interruptions", currentOrg?.id, decisionId],
    queryFn: async () => {
      if (!currentOrg) return [];
      let query = supabase
        .from("decision_interruptions" as any)
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (decisionId) query = query.eq("decision_id", decisionId);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
    enabled: !!currentOrg,
  });
}

export function useCreateInterruption() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      decision_id: string;
      description: string;
      source: string;
      engineers_diverted: number;
      estimated_days: number;
      impact_note?: string;
    }) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("decision_interruptions" as any)
        .insert({
          ...input,
          org_id: currentOrg.id,
          logged_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["interruptions", currentOrg?.id] });
      qc.invalidateQueries({ queryKey: ["interruptions", currentOrg?.id, vars.decision_id] });
      qc.invalidateQueries({ queryKey: ["decisions", currentOrg?.id] });
    },
  });
}
