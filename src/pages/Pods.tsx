import { useMemo, useState } from "react";
import { usePods, useDeletePod, useDecisions, useOverviewMetrics, useDecisionRisks } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import StatusBadge from "@/components/StatusBadge";
import RiskChip from "@/components/RiskChip";
import CreatePodForm from "@/components/CreatePodForm";
import { isClosedBetLifecycle } from "@/lib/bet-status";
import { cn } from "@/lib/utils";

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function Pods() {
  const { data: pods = [], isLoading: pLoading } = usePods();
  const { data: decisions = [], isLoading: dLoading } = useDecisions();
  const { data: risks = [] } = useDecisionRisks();
  const { data: metrics } = useOverviewMetrics();

  const riskByDecision = useMemo(() => {
    const m: Record<string, { risk_indicator: "Green" | "Yellow" | "Red" }> = {};
    for (const r of risks) {
      m[r.decision_id] = { risk_indicator: r.risk_indicator };
    }
    return m;
  }, [risks]);
  const deletePod = useDeletePod();
  const { currentRole } = useOrg();
  const [showCreate, setShowCreate] = useState(false);

  const isAdmin = currentRole === "admin";
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  if (pLoading || dLoading) return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;

  const isEmpty = pods.length === 0;

  const activeHighImpact = decisions.filter((d) => !isClosedBetLifecycle(d.status) && d.impact_tier === "High");
  const authorityActive = activeHighImpact.length >= 5;
  const activeDecisions = decisions.filter((d) => !isClosedBetLifecycle(d.status));

  // Group active decisions by solution_domain for unit matching
  const decisionsByDomain: Record<string, typeof decisions> = {};
  activeDecisions.forEach((d) => {
    const domain = d.solution_domain || "Cross";
    if (!decisionsByDomain[domain]) decisionsByDomain[domain] = [];
    decisionsByDomain[domain].push(d);
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Bet Units</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {authorityActive
              ? "Authority allocates. Cross-functional units execute."
              : `${pods.length} units · ${pods.reduce((sum: number, p: any) => sum + (p.pod_initiatives?.length || 0), 0)} initiatives`}
          </p>
        </div>
        {isAdmin && !showCreate && (
          <button onClick={() => setShowCreate(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors">
            + Create Unit
          </button>
        )}
      </div>

      {/* Authority Mode Banner */}
      {authorityActive && (
        <div className="mb-6 border rounded-md px-4 py-3 bg-accent/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-foreground rounded-full shrink-0" />
            <div>
              <p className="text-sm font-semibold">Units executing {activeHighImpact.length} active strategic commitments.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authority Mode Active — all slots occupied.
              </p>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreatePodForm onClose={() => setShowCreate(false)} />}

      {isEmpty && !showCreate ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No Bet Units Active.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Activate a unit to begin execution compression.</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground/50">
            <span>Unit Name</span><span>Active Bets</span><span>Slice Status</span><span>Velocity</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {pods.map((pod: any) => {
            const inits = pod.pod_initiatives || [];
            const shipped = inits.filter((i: any) => i.shipped).length;
            const total = inits.length;
            const withDemo = inits.filter((i: any) => i.last_demo_date);
            const avgCycle = withDemo.length
              ? Math.round(withDemo.reduce((s: number, i: any) => s + daysSince(i.last_demo_date!), 0) / withDemo.length)
              : null;
            const resolved = total ? Math.round((shipped / total) * 100) : 0;
            const zeroVelocity = shipped === 0 && total > 0;

            // Match decisions to unit by solution_domain
            const podDecisions = decisionsByDomain[pod.solution_domain] || [];

            // Compute slices shipped in last 7 days
            const shippedLast7 = inits.filter((i: any) => {
              if (!i.shipped || !i.last_demo_date) return false;
              return daysSince(i.last_demo_date) <= 7;
            }).length;

            // Last demo date across all initiatives
            const allDemos = inits
              .filter((i: any) => i.last_demo_date)
              .map((i: any) => new Date(i.last_demo_date).getTime());
            const lastDemoDate = allDemos.length > 0
              ? new Date(Math.max(...allDemos)).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : null;

            return (
              <div key={pod.id} className="border rounded-md">
                {/* Unit Header */}
                <div className={cn("px-4 py-3 border-b", zeroVelocity ? "bg-signal-amber/5" : "bg-surface-elevated")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={pod.solution_domain} />
                      <div>
                        <h2 className="text-sm font-semibold">{pod.name}</h2>
                        <p className="text-xs text-muted-foreground">{pod.owner}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {zeroVelocity && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Zero velocity</span>}
                      {isAdmin && (
                        <button onClick={() => { if (confirm(`Delete unit "${pod.name}"?`)) deletePod.mutate(pod.id); }}
                          className="text-[11px] font-semibold uppercase tracking-wider text-signal-red hover:underline ml-2">Delete</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Velocity Metrics Row */}
                <div className="px-4 py-2.5 border-b bg-muted/30">
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>Slices shipped (7d): <span className="font-semibold text-foreground font-mono">{shippedLast7}</span></span>
                    <span>Avg cycle: <span className="font-semibold text-foreground font-mono">{avgCycle !== null ? `${avgCycle}d` : "—"}</span></span>
                    <span>Last demo: <span className="font-semibold text-foreground font-mono">{lastDemoDate || "Never"}</span></span>
                    <span>Shipped: <span className="font-semibold text-foreground font-mono">{shipped}/{total}</span></span>
                    <span>Resolved: <span className="font-semibold text-foreground font-mono">{resolved}%</span></span>
                  </div>
                </div>

                {/* Active Strategic Bets assigned to this pod */}
                {podDecisions.length > 0 ? (
                  <div className="border-b">
                    <div className="px-4 py-2 bg-accent/20">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Active Bets · {podDecisions.length}
                      </p>
                    </div>
                    <div className="divide-y">
                      {podDecisions.map((d) => {
                        const sliceDue = d.slice_remaining !== undefined ? d.slice_remaining : null;
                        return (
                          <div key={d.id} className={cn(
                            "px-4 py-3",
                            d.decision_health === "Degrading" && "bg-signal-red/5",
                            d.decision_health === "At Risk" && "bg-signal-amber/5"
                          )}>
                            <div className="flex items-center gap-3 mb-1">
                              <div className="flex gap-1.5 shrink-0 items-center">
                                <StatusBadge status={d.solution_domain} />
                                {d.decision_health && <StatusBadge status={d.decision_health} />}
                                <RiskChip indicator={riskByDecision[d.id]?.risk_indicator ?? "Green"} />
                              </div>
                              <p className="text-sm font-medium flex-1 truncate">{d.title}</p>
                            </div>
                            <div className="flex gap-6 text-xs text-muted-foreground ml-0">
                              <span>Owner: <span className="font-medium text-foreground">{d.owner}</span></span>
                              <span>Slice due: <span className={cn(
                                "font-medium",
                                sliceDue !== null && sliceDue <= 0 ? "text-signal-red" :
                                sliceDue !== null && sliceDue <= 3 ? "text-signal-amber" :
                                "text-foreground"
                              )}>{sliceDue !== null ? (sliceDue <= 0 ? `${Math.abs(sliceDue)}d overdue` : `${sliceDue}d`) : "—"}</span></span>
                              <span>Health: <span className={cn(
                                "font-medium",
                                d.decision_health === "On Track" ? "text-signal-green" :
                                d.decision_health === "At Risk" ? "text-signal-amber" :
                                d.decision_health === "Degrading" ? "text-signal-red" :
                                "text-foreground"
                              )}>{d.decision_health || "—"}</span></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-4 border-b">
                    <p className="text-xs text-muted-foreground">No strategic commitments assigned.</p>
                  </div>
                )}

                {/* Initiatives */}
                {inits.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No initiatives yet.</div>
                ) : (
                  <div className="divide-y">
                    {inits.map((init: any) => {
                      const daysSinceDemo = init.last_demo_date ? daysSince(init.last_demo_date) : null;
                      const daysToSlice = -daysSince(init.slice_deadline);
                      const sliceOverdue = daysToSlice < 0;
                      const noDemo = !init.last_demo_date;

                      return (
                        <div key={init.id} className={cn("px-4 py-3", sliceOverdue && !init.shipped && "bg-signal-red/5")}>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-sm font-medium flex-1">{init.name}</p>
                            {init.shipped && <span className="text-[11px] font-semibold text-signal-green uppercase tracking-wider">Shipped</span>}
                            {!init.outcome_linked && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Unbound — No Outcome</span>}
                            {init.renewal_aligned && <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Renewal-Aligned</span>}
                          </div>
                          <div className="flex gap-6 text-xs text-muted-foreground">
                            <span>Owner: {init.owner}</span>
                            <span>Last demo: {noDemo ? <span className="text-signal-amber font-semibold">Never</span> : `${daysSinceDemo}d ago`}</span>
                            <span>Slice: <span className={cn(
                              sliceOverdue && !init.shipped ? "text-signal-red font-semibold" :
                              daysToSlice <= 3 && !init.shipped ? "text-signal-amber font-semibold" : ""
                            )}>{init.shipped ? "Delivered" : sliceOverdue ? `${Math.abs(daysToSlice)}d overdue` : `${daysToSlice}d left`}</span></span>
                            {init.cross_solution_dep && <span>Dep: <span className="font-medium text-foreground">{init.cross_solution_dep}</span></span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
