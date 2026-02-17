import { useState } from "react";
import { useDecisions, useDecisionRisks } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import StatusBadge from "@/components/StatusBadge";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import ProjectionPanel from "@/components/ProjectionPanel";
import { cn } from "@/lib/utils";
const categoryLabels: Record<string, string> = {
  arr: "ARR",
  renewal_retention: "Renewal & Retention",
  strategic_positioning: "Strategic Positioning",
  dpi_adoption: "DPI Adoption",
  agent_trust: "Agent Trust",
  live_event_risk: "Live Event Risk",
  operational_efficiency: "Operational Efficiency",
};

export default function Decisions() {
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { isLoading: risksLoading } = useDecisionRisks();
  const { currentRole } = useOrg();
  const [showCreate, setShowCreate] = useState(false);

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  if (decisionsLoading || risksLoading) return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;

  const activeDecisions = decisions.filter((d) => d.status === "active" && !!d.activated_at);
  const activeHighImpact = activeDecisions.filter((d) => d.impact_tier === "High");
  const atCapacity = activeHighImpact.length >= 5;
  const isEmpty = decisions.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Decisions</h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">
              {activeHighImpact.length}/5 Active{atCapacity ? " · At capacity" : ""}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {decisions.length} total · {activeDecisions.length} active
          </p>
        </div>
        {canWrite && !showCreate && !atCapacity && (
          <button onClick={() => setShowCreate(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors">
            + Register Decision
          </button>
        )}
      </div>

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

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

              return (
                <div key={d.id} className={cn("border rounded-md p-4", d.is_exceeded ? "border-signal-red/40 bg-signal-red/5" : d.is_aging ? "border-signal-amber/40" : "")}>
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    <StatusBadge status={d.solution_domain} />
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
                      <div><span className="text-muted-foreground">Category</span><p className="font-medium mt-0.5">{categoryLabels[(d.outcome_category_key ?? d.outcome_category) as string] ?? (d.outcome_category_key ?? d.outcome_category)}</p></div>
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
