import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type LoopStatus = "proposed" | "active" | "iterating" | "completed" | "killed";
export type LoopDecision = "scale" | "iterate" | "kill" | "unclear";

export const LOOP_STATUS_OPTIONS: { value: LoopStatus; label: string }[] = [
  { value: "proposed", label: "Proposed" },
  { value: "active", label: "Active" },
  { value: "iterating", label: "Iterating" },
  { value: "completed", label: "Completed" },
  { value: "killed", label: "Killed" },
];

export const LOOP_DECISION_OPTIONS: { value: LoopDecision; label: string }[] = [
  { value: "scale", label: "Scale" },
  { value: "iterate", label: "Iterate" },
  { value: "kill", label: "Kill" },
  { value: "unclear", label: "Unclear" },
];

export const LOOP_STATUS_LABELS: Record<LoopStatus, string> = {
  proposed: "Proposed",
  active: "Active",
  iterating: "Iterating",
  completed: "Completed",
  killed: "Killed",
};

export const LOOP_DECISION_LABELS: Record<LoopDecision, string> = {
  scale: "Scale",
  iterate: "Iterate",
  kill: "Kill",
  unclear: "Unclear",
};

export interface OutcomeLoop {
  id: string;
  bet_id: string;
  org_id: string;
  title: string;
  use_case: string;
  hypothesis: string | null;
  owner_user_id: string;
  contributors: Contribution[];
  status: LoopStatus;
  priority: number;
  last_ship_summary: string | null;
  last_ship_date: string | null;
  last_learning: string | null;
  last_learning_date: string | null;
  current_decision: LoopDecision;
  decision_notes: string | null;
  version_number: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Contribution {
  user_id: string;
  role: "owner" | "design" | "build" | "data";
  note: string;
}

export interface LoopVersion {
  id: string;
  loop_id: string;
  version_number: number;
  change_type: "ship" | "learning" | "decision" | "status";
  ship_summary: string | null;
  ship_date: string | null;
  learning: string | null;
  learning_date: string | null;
  decision: LoopDecision | null;
  decision_notes: string | null;
  status: LoopStatus | null;
  changed_by: string | null;
  created_at: string;
}

// Computed fields
export interface OutcomeLoopComputed extends OutcomeLoop {
  days_since_update: number;
  is_stale: boolean;
  has_no_decision: boolean;
  velocity_days: number | null;
}

function computeLoopFields(row: Record<string, unknown>): OutcomeLoopComputed {
  const now = Date.now();
  const updatedAt = new Date((row.updated_at as string) || 0).getTime();
  const createdAt = new Date((row.created_at as string) || 0).getTime();
  const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
  const status = (row.status as LoopStatus) || "proposed";
  const decision = (row.current_decision as LoopDecision) || "unclear";

  // Stale = active/iterating loop with no update in 7+ days
  const isActive = status === "active" || status === "iterating";
  const isStale = isActive && daysSinceUpdate >= 7;
  const hasNoDecision = isActive && decision === "unclear";

  // Velocity: days from created to completed/killed
  let velocityDays: number | null = null;
  if (status === "completed" || status === "killed") {
    velocityDays = Math.floor((updatedAt - createdAt) / (1000 * 60 * 60 * 24));
  }

  return {
    id: row.id as string,
    bet_id: row.bet_id as string,
    org_id: row.org_id as string,
    title: row.title as string,
    use_case: row.use_case as string,
    hypothesis: (row.hypothesis as string) ?? null,
    owner_user_id: row.owner_user_id as string,
    contributors: Array.isArray(row.contributors) ? row.contributors as Contribution[] : [],
    status,
    priority: (row.priority as number) ?? 0,
    last_ship_summary: (row.last_ship_summary as string) ?? null,
    last_ship_date: (row.last_ship_date as string) ?? null,
    last_learning: (row.last_learning as string) ?? null,
    last_learning_date: (row.last_learning_date as string) ?? null,
    current_decision: decision,
    decision_notes: (row.decision_notes as string) ?? null,
    version_number: (row.version_number as number) ?? 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    created_by: (row.created_by as string) ?? null,
    days_since_update: daysSinceUpdate,
    is_stale: isStale,
    has_no_decision: hasNoDecision,
    velocity_days: velocityDays,
  };
}

export function useOutcomeLoops(betId?: string) {
  const { currentOrg } = useOrg();
  return useQuery<OutcomeLoopComputed[]>({
    queryKey: ["outcome_loops", currentOrg?.id, betId],
    queryFn: async () => {
      if (!currentOrg) return [];
      let query = supabase
        .from("outcome_loops" as any)
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (betId) {
        query = query.eq("bet_id", betId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(computeLoopFields);
    },
    enabled: !!currentOrg,
  });
}

export function useLoopVersions(loopId: string | null) {
  return useQuery<LoopVersion[]>({
    queryKey: ["loop_versions", loopId],
    queryFn: async () => {
      if (!loopId) return [];
      const { data, error } = await supabase
        .from("loop_versions" as any)
        .select("*")
        .eq("loop_id", loopId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LoopVersion[];
    },
    enabled: !!loopId,
  });
}

export interface CreateLoopInput {
  bet_id: string;
  title: string;
  use_case: string;
  hypothesis?: string;
  owner_user_id: string;
  priority?: number;
}

export function useCreateLoop() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateLoopInput) => {
      if (!currentOrg || !user) throw new Error("No org or user");
      const { data, error } = await supabase
        .from("outcome_loops" as any)
        .insert({
          ...input,
          org_id: currentOrg.id,
          created_by: user.id,
          status: "proposed",
          current_decision: "unclear",
          version_number: 1,
          contributors: JSON.stringify([{ user_id: input.owner_user_id, role: "owner", note: "" }]),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["outcome_loops", currentOrg?.id, variables.bet_id] });
      qc.invalidateQueries({ queryKey: ["outcome_loops", currentOrg?.id, undefined] });
    },
  });
}

export function useUpdateLoop() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<
        OutcomeLoop,
        | "title"
        | "use_case"
        | "hypothesis"
        | "status"
        | "priority"
        | "last_ship_summary"
        | "last_ship_date"
        | "last_learning"
        | "last_learning_date"
        | "current_decision"
        | "decision_notes"
        | "contributors"
        | "owner_user_id"
      >
    >) => {
      // Determine if this is a versioned change
      const isVersionedChange =
        "last_ship_summary" in updates ||
        "last_learning" in updates ||
        "current_decision" in updates;

      // If versioned, increment version_number
      let payload: Record<string, unknown> = { ...updates };
      if (updates.contributors) {
        payload.contributors = JSON.stringify(updates.contributors);
      }

      if (isVersionedChange) {
        // Get current version
        const { data: current } = await supabase
          .from("outcome_loops" as any)
          .select("version_number, status, last_ship_summary, last_ship_date, last_learning, last_learning_date, current_decision, decision_notes")
          .eq("id", id)
          .single();
        const currentVersion = (current as any)?.version_number ?? 1;
        const newVersion = currentVersion + 1;
        payload.version_number = newVersion;

        // Determine change_type
        let changeType = "status";
        if ("last_ship_summary" in updates) changeType = "ship";
        else if ("last_learning" in updates) changeType = "learning";
        else if ("current_decision" in updates) changeType = "decision";

        // Insert version snapshot
        await supabase.from("loop_versions" as any).insert({
          loop_id: id,
          version_number: newVersion,
          change_type: changeType,
          ship_summary: updates.last_ship_summary ?? (current as any)?.last_ship_summary ?? null,
          ship_date: updates.last_ship_date ?? (current as any)?.last_ship_date ?? null,
          learning: updates.last_learning ?? (current as any)?.last_learning ?? null,
          learning_date: updates.last_learning_date ?? (current as any)?.last_learning_date ?? null,
          decision: updates.current_decision ?? (current as any)?.current_decision ?? null,
          decision_notes: updates.decision_notes ?? (current as any)?.decision_notes ?? null,
          status: updates.status ?? (current as any)?.status ?? null,
          changed_by: user?.id ?? null,
        });
      }

      const { data, error } = await supabase
        .from("outcome_loops" as any)
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outcome_loops"] });
      qc.invalidateQueries({ queryKey: ["loop_versions"] });
    },
  });
}

export function useDeleteLoop() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("outcome_loops" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outcome_loops"] });
      qc.invalidateQueries({ queryKey: ["loop_versions"] });
    },
  });
}
