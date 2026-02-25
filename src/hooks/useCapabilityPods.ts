import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/telemetry";
import type { CapabilityPod, KpiTarget, PodDependencies } from "@/lib/types";
import { parseKpiTargets, parsePodDependencies } from "@/lib/types";

function rowToPod(row: Record<string, unknown>): CapabilityPod {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    primary_bet_id: row.primary_bet_id as string,
    secondary_bet_id: (row.secondary_bet_id as string) ?? null,
    owner: row.owner as string,
    status: row.status as CapabilityPod["status"],
    deliverable: (row.deliverable as string) ?? null,
    kpi_targets: parseKpiTargets(row.kpi_targets),
    prototype_built: row.prototype_built as boolean,
    customer_validated: row.customer_validated as boolean,
    production_shipped: row.production_shipped as boolean,
    cycle_time_days: (row.cycle_time_days as number) ?? null,
    dependencies: parsePodDependencies(row.dependencies),
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

const POD_FIELDS = "id, org_id, name, description, primary_bet_id, secondary_bet_id, owner, status, deliverable, kpi_targets, prototype_built, customer_validated, production_shipped, cycle_time_days, dependencies, created_by, created_at, updated_at";

export function useCapabilityPods() {
  const { currentOrg } = useOrg();
  return useQuery<CapabilityPod[]>({
    queryKey: ["capability_pods", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("capability_pods")
        .select(POD_FIELDS)
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(rowToPod);
    },
    enabled: !!currentOrg,
  });
}

export function useCapabilityPodsForBet(betId: string | undefined) {
  const { currentOrg } = useOrg();
  return useQuery<CapabilityPod[]>({
    queryKey: ["capability_pods_for_bet", betId],
    queryFn: async () => {
      if (!currentOrg || !betId) return [];
      const { data, error } = await supabase
        .from("capability_pods")
        .select(POD_FIELDS)
        .eq("org_id", currentOrg.id)
        .or(`primary_bet_id.eq.${betId},secondary_bet_id.eq.${betId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(rowToPod);
    },
    enabled: !!currentOrg && !!betId,
  });
}

export interface CreateCapabilityPodInput {
  name: string;
  description?: string | null;
  primary_bet_id: string;
  secondary_bet_id?: string | null;
  owner: string;
  status?: CapabilityPod["status"];
  deliverable?: string | null;
  kpi_targets?: KpiTarget[];
  prototype_built?: boolean;
  customer_validated?: boolean;
  production_shipped?: boolean;
  cycle_time_days?: number | null;
  dependencies?: PodDependencies;
}

export function useCreateCapabilityPod() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateCapabilityPodInput) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("capability_pods")
        .insert({
          ...input,
          org_id: currentOrg.id,
          created_by: user.id,
          kpi_targets: (input.kpi_targets ?? []) as any,
          dependencies: (input.dependencies ?? { shared_primitive: false, notes: "", blocking_pods: [] }) as any,
        })
        .select()
        .single();
      if (error) throw error;
      void trackEvent("capability_pod_created", {
        orgId: currentOrg.id,
        userId: user.id,
        metadata: { pod_id: data.id, primary_bet_id: data.primary_bet_id },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capability_pods"] });
      qc.invalidateQueries({ queryKey: ["capability_pods_for_bet"] });
    },
  });
}

export function useUpdateCapabilityPod() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateCapabilityPodInput>) => {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.kpi_targets) payload.kpi_targets = updates.kpi_targets as any;
      if (updates.dependencies) payload.dependencies = updates.dependencies as any;
      const { data, error } = await supabase
        .from("capability_pods")
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      void trackEvent("capability_pod_updated", {
        orgId: currentOrg?.id ?? null,
        userId: user?.id ?? null,
        metadata: { pod_id: data.id, changed_fields: Object.keys(updates) },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capability_pods"] });
      qc.invalidateQueries({ queryKey: ["capability_pods_for_bet"] });
    },
  });
}

export function useDeleteCapabilityPod() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("capability_pods").delete().eq("id", id);
      if (error) throw error;
      void trackEvent("capability_pod_deleted", {
        orgId: currentOrg?.id ?? null,
        userId: user?.id ?? null,
        metadata: { pod_id: id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capability_pods"] });
      qc.invalidateQueries({ queryKey: ["capability_pods_for_bet"] });
    },
  });
}

export function useCapabilityPodActivity(podId: string | undefined) {
  return useQuery({
    queryKey: ["capability_pod_events", podId],
    queryFn: async () => {
      if (!podId) return [];
      const { data, error } = await supabase
        .from("capability_pod_events")
        .select("id, pod_id, field_name, old_value, new_value, changed_by, created_at")
        .eq("pod_id", podId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!podId,
  });
}

export function useLogCapabilityPodActivity() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ podId, field, oldValue, newValue }: { podId: string; field: string; oldValue: string | null; newValue: string | null }) => {
      if (!currentOrg || !user) return;
      const { error } = await supabase.from("capability_pod_events").insert({
        pod_id: podId,
        org_id: currentOrg.id,
        field_name: field,
        old_value: oldValue,
        new_value: newValue,
        changed_by: user.id,
      });
      if (error) console.error("Failed to log pod activity:", error);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["capability_pod_events", vars.podId] });
    },
  });
}

export function useBulkCreateCapabilityPods() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (items: CreateCapabilityPodInput[]) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const rows = items.map((item) => ({
        ...item,
        org_id: currentOrg.id,
        created_by: user.id,
        kpi_targets: (item.kpi_targets ?? []) as any,
        dependencies: (item.dependencies ?? { shared_primitive: false, notes: "", blocking_pods: [] }) as any,
      }));
      const { data, error } = await supabase
        .from("capability_pods")
        .insert(rows)
        .select();
      if (error) throw error;
      return data || [];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capability_pods"] });
      qc.invalidateQueries({ queryKey: ["capability_pods_for_bet"] });
    },
  });
}
