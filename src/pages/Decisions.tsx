import { useState } from "react";
import { useDecisions, useUpdateDecision, useDeleteDecision } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import StatusBadge from "@/components/StatusBadge";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DecisionStatus = Database["public"]["Enums"]["decision_status"];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function Decisions() {
  const { data: decisions = [], isLoading } = useDecisions();
  const updateDecision = useUpdateDecision();
  const deleteDecision = useDeleteDecision();
  const { currentRole } = useOrg();
  const [showCreate, setShowCreate] = useState(false);

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";
  const canDelete = currentRole === "admin";

  if (isLoading) return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;

  const grouped = {
    Active: decisions.filter((d) => d.status === "Active"),
    Blocked: decisions.filter((d) => d.status === "Blocked"),
    Draft: decisions.filter((d) => d.status === "Draft"),
  };

  const highActive = grouped.Active.filter((d) => d.impact_tier === "High").length;
  const atCapacity = highActive >= 5;
  const isEmpty = decisions.length === 0;

  const statusOptions: DecisionStatus[] = ["Draft", "Active", "Blocked", "Closed"];

  const handleStatusChange = (id: string, newStatus: DecisionStatus) => {
    updateDecision.mutate({ id, status: newStatus });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Decisions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {decisions.length} total · {grouped.Active.length} active
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
        <div className="mb-6 border border-signal-red/40 bg-signal-red/5 rounded-md px-4 py-3">
          <p className="text-sm font-semibold text-signal-red">High-Impact Capacity Full — Decision Authority Saturated</p>
          <p className="text-xs text-signal-red/80 mt-0.5">5/5 strategic decision slots active. Close 1 to open 1.</p>
        </div>
      )}

      {isEmpty && !showCreate ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No High-Impact Decisions Registered.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Authority begins by defining the five decisions that matter most.</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground/50">
            <span>Hard cap: 5</span><span>10-day slice rule</span><span>Outcome required</span><span>Owner required</span>
          </div>
        </div>
      ) : (
        (["Active", "Blocked", "Draft"] as const).map((status) => {
          const items = grouped[status];
          if (items.length === 0) return null;
          return (
            <section key={status} className="mb-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{status} ({items.length})</h2>
              <div className="space-y-2">
                {items.map((d) => {
                  const age = daysSince(d.created_at);
                  const aging = age > 7;
                  const sliceMax = d.slice_deadline_days || 10;
                  const sliceRemaining = sliceMax - age;
                  const exceeded = sliceRemaining < 0;
                  const urgent = sliceRemaining >= 0 && sliceRemaining <= 3;
                  const unboundOutcome = !d.outcome_category;
                  const isBlocked = d.status === "Blocked";
                  const execAttention = isBlocked && age > 7;

                  return (
                    <div key={d.id} className={cn("border rounded-md p-4", exceeded ? "border-signal-red/40 bg-signal-red/5" : aging ? "border-signal-amber/40" : "")}>
                      <div className="flex items-start gap-2 mb-2 flex-wrap">
                        <StatusBadge status={d.solution_type} />
                        <StatusBadge status={d.impact_tier} />
                        <StatusBadge status={d.status} />
                        {d.decision_health && <StatusBadge status={d.decision_health} />}
                        {d.status === "Active" && (
                          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", exceeded ? "text-signal-red" : urgent ? "text-signal-amber" : "text-muted-foreground")}>
                            {exceeded ? `Exceeded ${sliceMax}d build window` : `Slice due in ${sliceRemaining}d`}
                          </span>
                        )}
                        {aging && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider animate-pulse-slow">Aging</span>}
                        {unboundOutcome && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider ml-auto">Unbound — no authority</span>}
                        {execAttention && <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider ml-auto animate-pulse-slow">Executive Attention Required</span>}
                      </div>

                      <h3 className="text-sm font-semibold mb-1">{d.title}</h3>
                      {d.trigger_signal && <p className="text-xs text-muted-foreground mb-3">{d.trigger_signal}</p>}

                      <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                        <div><span className="text-muted-foreground">Surface</span><p className="font-medium mt-0.5">{d.surface}</p></div>
                        <div><span className="text-muted-foreground">Outcome Target</span><p className="font-medium mt-0.5">{d.outcome_target || "—"}</p></div>
                        {d.outcome_category && <div><span className="text-muted-foreground">Category</span><p className="font-medium mt-0.5">{d.outcome_category}</p></div>}
                        {d.expected_impact && <div><span className="text-muted-foreground">Expected Impact</span><p className="font-medium mt-0.5">{d.expected_impact}</p></div>}
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                        {d.current_delta && <div><span className="text-muted-foreground">Current Delta</span><p className="font-semibold mt-0.5 text-signal-amber">{d.current_delta}</p></div>}
                        {d.revenue_at_risk && <div><span className="text-muted-foreground">Enterprise Exposure</span><p className="font-semibold mt-0.5 text-signal-red">{d.revenue_at_risk}</p></div>}
                        {d.segment_impact && <div><span className="text-muted-foreground">Segment</span><p className="font-medium mt-0.5">{d.segment_impact}</p></div>}
                        <div><span className="text-muted-foreground">Owner</span><p className="font-medium mt-0.5">{d.owner}</p></div>
                      </div>

                      <div className="flex items-center gap-6 text-xs">
                        <div>
                          <span className="text-muted-foreground">Age</span>
                          <p className={cn("font-semibold text-mono mt-0.5", aging && "text-signal-amber")}>{age} days</p>
                        </div>
                        {canWrite && (
                          <div>
                            <span className="text-muted-foreground">Status</span>
                            <select value={d.status} onChange={(e) => handleStatusChange(d.id, e.target.value as DecisionStatus)}
                              className="block mt-0.5 border rounded-sm px-2 py-1 text-xs bg-background focus:outline-none">
                              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
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

                      {isBlocked && d.blocked_reason && (
                        <div className="mt-3 pt-3 border-t text-xs">
                          <p className="text-muted-foreground">Blocked: {d.blocked_reason}</p>
                          {d.blocked_dependency_owner && <p className="text-muted-foreground mt-0.5">Dependency: {d.blocked_dependency_owner}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
