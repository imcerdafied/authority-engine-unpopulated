import { useMemo, useState } from "react";
import { useDecisions, useUpdateDecision, useDeleteDecision, useDecisionRisks } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import StatusBadge from "@/components/StatusBadge";
import RiskChip from "@/components/RiskChip";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import ProjectionPanel from "@/components/ProjectionPanel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type { DecisionComputed } from "@/hooks/useOrgData";

type DecisionStatus = "active" | "accepted" | "rejected" | "archived";

function parseWorkflowError(msg: string): string | null {
  const map: Record<string, string> = {
    HIGH_IMPACT_CAP: "Cannot exceed 5 active high-impact decisions.",
    OUTCOME_REQUIRED: "Outcome Target required to activate.",
    OWNER_REQUIRED: "Owner required to activate.",
    OUTCOME_CATEGORY_REQUIRED: "Outcome Category required to activate.",
    EXPECTED_IMPACT_REQUIRED: "Expected Impact required to activate.",
    EXPOSURE_REQUIRED: "Exposure Value required to activate.",
    ACTUAL_OUTCOME_REQUIRED: "Actual Outcome Value required to close.",
    OUTCOME_DELTA_REQUIRED: "Outcome Delta required to close.",
    CLOSURE_NOTE_REQUIRED: "Closure Note required to close.",
  };
  for (const [key, label] of Object.entries(map)) {
    if (msg.includes(key)) return label;
  }
  return null;
}

function WorkflowBadge({ label, type = "info" }: { label: string; type?: "info" | "warn" | "success" }) {
  return (
    <span className={cn(
      "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm",
      type === "warn" && "bg-signal-amber/10 text-signal-amber",
      type === "success" && "bg-signal-green/10 text-signal-green",
      type === "info" && "bg-muted text-muted-foreground"
    )}>
      {label}
    </span>
  );
}

function getReadinessIssues(d: DecisionComputed): string[] {
  const issues: string[] = [];
  if (!d.outcome_target) issues.push("Outcome Target");
  if (!d.outcome_category_key && !d.outcome_category) issues.push("Outcome Category");
  if (!d.expected_impact) issues.push("Expected Impact");
  if (!d.exposure_value) issues.push("Exposure Value");
  if (!d.owner) issues.push("Owner");
  return issues;
}

export default function Decisions() {
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { data: risks = [], isLoading: risksLoading } = useDecisionRisks();
  const updateDecision = useUpdateDecision();
  const deleteDecision = useDeleteDecision();
  const { currentRole } = useOrg();
  const [showCreate, setShowCreate] = useState(false);
  const riskByDecision = useMemo(() => {
    const m: Record<string, { risk_indicator: "Green" | "Yellow" | "Red"; risk_score: number }> = {};
    const validIndicators = ["Green", "Yellow", "Red"] as const;
    for (const r of risks) {
      const indicator = validIndicators.includes(r.risk_indicator as any)
        ? (r.risk_indicator as "Green" | "Yellow" | "Red")
        : "Green";
      m[r.decision_id] = {
        risk_indicator: indicator,
        risk_score: r.risk_score ?? 0,
      };
    }
    return m;
  }, [risks]);

  const getRisk = (decisionId: string) =>
    riskByDecision[decisionId] ?? { risk_indicator: "Green" as const, risk_score: 0 };

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";
  const canDelete = currentRole === "admin";

  if (decisionsLoading || risksLoading) return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;

  const activeDecisions = decisions.filter((d) => d.status === "active" && !!d.activated_at);
  const highActive = activeDecisions.filter((d) => d.impact_tier === "High").length;
  const atCapacity = highActive >= 5;
  const isEmpty = decisions.length === 0;

  const statusOptions: DecisionStatus[] = ["active", "accepted", "rejected", "archived"];

  const handleStatusChange = (d: DecisionComputed, newStatus: DecisionStatus) => {
    updateDecision.mutate(
      { id: d.id, status: newStatus as any },
      {
        onError: (err: any) => {
          const msg = err?.message || String(err);
          const parsed = parseWorkflowError(msg);
          toast.error(parsed || "Failed to update status.");
        },
      }
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Decisions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {decisions.length} total · {activeDecisions.length} active
          </p>
        </div>
        {canWrite && !showCreate && (
          <button onClick={() => setShowCreate(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors">
            + Register Decision
          </button>
        )}
      </div>

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

      {atCapacity && (
        <div className="mb-6 border border-foreground rounded-md px-4 py-3">
          <p className="text-sm font-bold">High-Impact Capacity Full — Authority Mode Active</p>
          <p className="text-xs text-muted-foreground mt-0.5">Close 1 decision to open 1.</p>
        </div>
      )}

      {isEmpty && !showCreate ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No decisions registered.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Register first high-impact decision to initiate constraint.</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground/50">
            <span>Hard cap: 5</span><span>10-day slice rule</span><span>Outcome required</span><span>Owner required</span>
          </div>
        </div>
      ) : (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">All Decisions ({decisions.length})</h2>
          <div className="space-y-2">
            {decisions.map((d) => {
              const isActive = d.status === "active";
              const readinessIssues = isActive ? getReadinessIssues(d) : [];

              return (
                <div key={d.id} className={cn("border rounded-md p-4", d.is_exceeded ? "border-signal-red/40 bg-signal-red/5" : d.is_aging ? "border-signal-amber/40" : "")}>
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    <StatusBadge status={d.solution_domain} />
                    <StatusBadge status={d.impact_tier} />
                    <StatusBadge status={d.status} />
                    {d.decision_health && <StatusBadge status={d.decision_health} />}
                    <RiskChip indicator={getRisk(d.id).risk_indicator} />

                    {isActive && readinessIssues.length === 0 && (
                      <WorkflowBadge label="Ready" type="success" />
                    )}
                    {isActive && readinessIssues.length > 0 && (
                      <WorkflowBadge label={`Missing: ${readinessIssues.join(", ")}`} type="warn" />
                    )}
                    {isActive && d.activated_at && (
                      <WorkflowBadge label="Activated" type="success" />
                    )}

                    {isActive && (
                      <span className={cn("text-[11px] font-semibold uppercase tracking-wider", d.is_exceeded ? "text-signal-red" : d.is_urgent ? "text-signal-amber" : "text-muted-foreground")}>
                        {d.is_exceeded ? `Exceeded ${d.slice_deadline_days || 10}d build window` : `Slice due in ${d.slice_remaining}d`}
                      </span>
                    )}
                    {d.is_aging && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Aging</span>}
                    {d.is_unbound && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider ml-auto">Unbound — no authority</span>}
                    {d.needs_exec_attention && <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider ml-auto">Executive Attention Required</span>}
                  </div>

                  <h3 className="text-sm font-semibold mb-1">{d.title}</h3>
                  {d.trigger_signal && <p className="text-xs text-muted-foreground mb-3">{d.trigger_signal}</p>}

                  <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                    <div><span className="text-muted-foreground">Surface</span><p className="font-medium mt-0.5">{d.surface}</p></div>
                    <div><span className="text-muted-foreground">Outcome Target</span><p className="font-medium mt-0.5">{d.outcome_target || "—"}</p></div>
                    {(d.outcome_category_key || d.outcome_category) && (
                      <div><span className="text-muted-foreground">Category</span><p className="font-medium mt-0.5">{d.outcome_category_key ?? d.outcome_category}</p></div>
                    )}
                    {d.expected_impact && <div><span className="text-muted-foreground">Expected Impact</span><p className="font-medium mt-0.5">{d.expected_impact}</p></div>}
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                    {d.exposure_value && <div><span className="text-muted-foreground">Exposure</span><p className="font-semibold mt-0.5 text-signal-amber">{d.exposure_value}</p></div>}
                    {d.current_delta && <div><span className="text-muted-foreground">Current Delta</span><p className="font-semibold mt-0.5 text-signal-amber">{d.current_delta}</p></div>}
                    {d.revenue_at_risk && <div><span className="text-muted-foreground">Enterprise Exposure</span><p className="font-semibold mt-0.5 text-signal-red">{d.revenue_at_risk}</p></div>}
                    {d.segment_impact && <div><span className="text-muted-foreground">Segment</span><p className="font-medium mt-0.5">{d.segment_impact}</p></div>}
                    <div><span className="text-muted-foreground">Owner</span><p className="font-medium mt-0.5">{d.owner}</p></div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-muted-foreground">Age</span>
                      <p className={cn("font-semibold text-mono mt-0.5", d.is_aging && "text-signal-amber")}>{d.age_days} days</p>
                    </div>
                    {canWrite && (
                      <div>
                        <span className="text-muted-foreground">Status</span>
                        <select value={d.status} onChange={(e) => handleStatusChange(d, e.target.value as DecisionStatus)}
                          className="block mt-0.5 border rounded-sm px-2 py-1 text-xs bg-background focus:outline-none">
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {canDelete && (
                      <button onClick={() => { if (confirm("Delete this decision?")) deleteDecision.mutate(d.id); }}
                        className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-signal-red hover:underline">
                        Delete
                      </button>
                    )}
                  </div>

                  {d.blocked_reason && (
                    <div className="mt-3 pt-3 border-t text-xs">
                      <p className="text-muted-foreground">Blocked: {d.blocked_reason}</p>
                      {d.blocked_dependency_owner && <p className="text-muted-foreground mt-0.5">Dependency: {d.blocked_dependency_owner}</p>}
                    </div>
                  )}

                  {isActive && (
                    <ProjectionPanel decision={d} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
