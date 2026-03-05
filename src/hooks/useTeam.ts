import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingInvitation {
  id: string;
  org_id: string;
  email: string;
  role: "admin" | "pod_lead" | "viewer";
  role_label: string | null;
  invited_by: string | null;
  created_at: string;
  claimed_at: string | null;
}

export interface OrgMember {
  user_id: string;
  org_id: string;
  role: "admin" | "pod_lead" | "viewer";
  role_label: string | null;
  joined_at: string;
  email?: string;
  display_name?: string | null;
}

export function usePendingInvitations() {
  const { currentOrg } = useOrg();
  return useQuery<PendingInvitation[]>({
    queryKey: ["pending_invitations", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("pending_invitations")
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

      // Try RPC first (SECURITY DEFINER — bypasses profiles RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_org_members" as any,
        { target_org_id: currentOrg.id },
      );
      if (!rpcError && rpcData && Array.isArray(rpcData)) {
        return (rpcData as any[]).map((r) => ({
          user_id: r.user_id,
          org_id: currentOrg.id,
          role: r.role,
          role_label: r.role_label || null,
          joined_at: r.joined_at,
          email: r.email || undefined,
          display_name: r.display_name || null,
        }));
      }

      // Fallback: direct query (limited by profiles RLS)
      let { data: membersData, error } = await supabase
        .from("organization_memberships")
        .select("user_id, org_id, role, role_label, created_at")
        .eq("org_id", currentOrg.id);
      if (error && String(error.message || "").includes("role_label")) {
        const retry = await supabase
          .from("organization_memberships")
          .select("user_id, org_id, role, created_at")
          .eq("org_id", currentOrg.id);
        membersData = retry.data?.map((row) => ({ ...row, role_label: null })) as any;
        error = retry.error as any;
      }
      if (error) throw error;
      const members = (membersData || []).map((m) => ({
        user_id: m.user_id,
        org_id: m.org_id,
        role: m.role as "admin" | "pod_lead" | "viewer",
        role_label: m.role_label ?? null,
        joined_at: m.created_at,
      }));
      const userIds = members.map((m) => m.user_id);
      if (userIds.length === 0) return members;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      return members.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          ...m,
          display_name: profile?.display_name ?? null,
          email: profile?.email ?? undefined,
        };
      });
    },
    enabled: !!currentOrg,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      email,
      role,
      roleLabel,
    }: {
      email: string;
      role: "admin" | "pod_lead" | "viewer";
      roleLabel?: string;
    }) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      let { data, error } = await supabase
        .from("pending_invitations")
        .insert({
          org_id: currentOrg.id,
          email: email.toLowerCase().trim(),
          role,
          role_label: roleLabel?.trim() || null,
          invited_by: user.id,
        })
        .select()
        .single();
      if (error && String(error.message || "").includes("role_label")) {
        const retry = await supabase
          .from("pending_invitations")
          .insert({
            org_id: currentOrg.id,
            email: email.toLowerCase().trim(),
            role,
            invited_by: user.id,
          })
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }
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
        .from("pending_invitations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_invitations", currentOrg?.id] });
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "pod_lead" | "viewer" }) => {
      if (!currentOrg) throw new Error("No org selected");
      const { error } = await supabase
        .from("organization_memberships")
        .update({ role } as any)
        .eq("org_id", currentOrg.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_members", currentOrg?.id] });
    },
  });
}
