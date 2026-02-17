import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";

export function useInvitations() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["invitations", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("pending_invitations")
        .select("*")
        .eq("org_id", currentOrg.id)
        .is("claimed_at", null)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!currentOrg,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("pending_invitations")
        .insert({ org_id: currentOrg.id, email: email.toLowerCase(), role, invited_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", currentOrg?.id] }),
  });
}

export function useDeleteInvitation() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pending_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", currentOrg?.id] }),
  });
}
