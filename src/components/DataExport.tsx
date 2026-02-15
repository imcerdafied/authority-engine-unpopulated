import { useDecisions, useSignals, usePods } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import { exportToCsv } from "@/lib/csvExport";
import { toast } from "sonner";

const decisionColumns = [
  "id", "title", "surface", "owner", "status", "impact_tier", "solution_domain",
  "outcome_category", "expected_impact", "exposure_value", "outcome_target",
  "trigger_signal", "current_delta", "revenue_at_risk", "segment_impact",
  "decision_health", "blocked_reason", "blocked_dependency_owner",
  "slice_deadline_days", "slice_remaining", "age_days",
  "is_exceeded", "is_urgent", "is_aging", "is_unbound", "needs_exec_attention",
  "actual_outcome_value", "outcome_delta", "closure_note",
  "shipped_slice_date", "measured_outcome_result",
  "created_at", "updated_at", "activated_at",
];

const signalColumns = [
  "id", "type", "source", "description", "solution_domain",
  "decision_id", "created_at",
];

const podColumns = [
  "id", "name", "owner", "solution_domain", "created_at",
];

export default function DataExport() {
  const { currentRole } = useOrg();
  const { data: decisions = [] } = useDecisions();
  const { data: signals = [] } = useSignals();
  const { data: pods = [] } = usePods();

  if (currentRole !== "admin") return null;

  const stamp = new Date().toISOString().slice(0, 10);

  const handleExport = (type: "decisions" | "signals" | "pods") => {
    try {
      if (type === "decisions") {
        exportToCsv(decisions as any[], `decisions_${stamp}.csv`, decisionColumns);
      } else if (type === "signals") {
        exportToCsv(signals as any[], `signals_${stamp}.csv`, signalColumns);
      } else {
        const flat = pods.map((p: any) => ({
          id: p.id, name: p.name, owner: p.owner,
          solution_domain: p.solution_domain, created_at: p.created_at,
          initiative_count: p.pod_initiatives?.length ?? 0,
          shipped_count: p.pod_initiatives?.filter((i: any) => i.shipped).length ?? 0,
        }));
        exportToCsv(flat, `pods_${stamp}.csv`, [
          "id", "name", "owner", "solution_domain", "created_at",
          "initiative_count", "shipped_count",
        ]);
      }
      toast.success(`${type} exported`);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport("decisions")}
        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border rounded-sm px-2.5 py-1 hover:bg-accent transition-colors"
      >
        Export Decisions
      </button>
      <button
        onClick={() => handleExport("signals")}
        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border rounded-sm px-2.5 py-1 hover:bg-accent transition-colors"
      >
        Export Signals
      </button>
      <button
        onClick={() => handleExport("pods")}
        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border rounded-sm px-2.5 py-1 hover:bg-accent transition-colors"
      >
        Export Pods
      </button>
    </div>
  );
}
