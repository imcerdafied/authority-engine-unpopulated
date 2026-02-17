import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingInvitation {
  id: string;
  org_id: string;
  email: string;
  role: string;
  invited_by: string | null;
  created_at: string;
  claimed_at: string | null;
}

export interface OrgMember {
  user_id: string;
  org_id: string;
  role: string;
  email?: string;
}

export function usePendingInvitations() {
  const { currentOrg } = useOrg();
  return useQuery<PendingInvitation[]>({
    queryKey: ["pending_invitations", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("pending_invitations" as any)
        .select("*")
        .eq("org_id", currentOrg.id)
        .is("claimed_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PendingInvitation[];
    },
    enabled: !!currentOrg,
  });
}

export function useOrgMembers() {
  const { currentOrg } = useOrg();
  return useQuery<OrgMember[]>({
    queryKey: ["org_members", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("organization_memberships")
        .select("user_id, org_id, role")
        .eq("org_id", currentOrg.id);
      if (error) throw error;
      return (data || []) as OrgMember[];
    },
    enabled: !!currentOrg,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("pending_invitations" as any)
        .insert({
          org_id: currentOrg.id,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_invitations", currentOrg?.id] });
    },
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pending_invitations" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_invitations", currentOrg?.id] });
    },
  });
}
