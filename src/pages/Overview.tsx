import { useDecisions, useSignals, usePods, useOverviewMetrics } from "@/hooks/useOrgData";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

type SolutionDomain = "S1" | "S2" | "S3" | "Cross";

function computeSolutionDrift(decisions: any[]) {
  const active = decisions.filter((d) => d.status === "Active");
  const counts: Record<SolutionDomain, number> = { S1: 0, S2: 0, S3: 0, "Cross": 0 };
  active.forEach((d) => { counts[d.solution_domain as SolutionDomain]++; });
  const total = active.length || 1;
  const s1Pct = Math.round((counts.S1 / total) * 100);
  const s2Pct = Math.round((counts.S2 / total) * 100);
  const s3Pct = Math.round((counts.S3 / total) * 100);
  const legacyGravity = s1Pct > 50;
  return { s1Pct, s2Pct, s3Pct, counts, legacyGravity };
}

function computeBuilderVelocity(pods: any[]) {
  return pods.map((pod: any) => {
    const inits = pod.pod_initiatives || [];
    const shipped = inits.filter((i: any) => i.shipped).length;
    const total = inits.length;
    const withDemo = inits.filter((i: any) => i.last_demo_date);
    const avgCycle = withDemo.length
      ? Math.round(withDemo.reduce((s: number, i: any) => s + daysSince(i.last_demo_date!), 0) / withDemo.length)
      : null;
    const resolved = total ? Math.round((shipped / total) * 100) : 0;
    return { name: pod.name, solutionDomain: pod.solution_domain, shipped, total, avgCycle, resolved };
  });
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="border border-dashed rounded-md px-6 py-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

export default function Overview() {
  const [executiveMode, setExecutiveMode] = useState(false);
  const { data: decisions = [], isLoading: dLoading } = useDecisions();
  const { data: signals = [], isLoading: sLoading } = useSignals();
  const { data: pods = [], isLoading: pLoading } = usePods();
  const { data: metrics, isLoading: mLoading } = useOverviewMetrics();

  if (dLoading || sLoading || pLoading || mLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const m = metrics || {
    active_high_impact: 0, blocked_gt5_days: 0, unlinked_signals: 0,
    decision_latency_days: 0, overdue_slices: 0, total_active: 0,
    blocked_count: 0, friction_score: 0, friction_level: "Low",
    friction_drivers: [], at_capacity: false,
  };

  const isEmpty = decisions.length === 0 && signals.length === 0 && pods.length === 0;

  const activeDecisions = decisions.filter((d) => d.status === "Active");
  const blockedDecisions = decisions.filter(
    (d) => d.status === "Blocked" && daysSince(d.created_at) > 5
  );
  const unlinkedSignals = signals.filter((s) => !s.decision_id);

  const drift = computeSolutionDrift(decisions);
  const velocity = computeBuilderVelocity(pods);

  const totalRevenueAtRisk = decisions
    .filter((d) => d.status === "Active" && d.revenue_at_risk)
    .map((d) => d.revenue_at_risk!)
    .join(" · ");

  const top3Risk = [...activeDecisions]
    .sort((a, b) => {
      const tierOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      if (tierOrder[a.impact_tier] !== tierOrder[b.impact_tier]) return tierOrder[a.impact_tier] - tierOrder[b.impact_tier];
      return daysSince(b.created_at) - daysSince(a.created_at);
    })
    .slice(0, 3);

  if (executiveMode) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Executive View</h1>
            <p className="text-sm text-muted-foreground mt-1">Board-ready clarity — what requires attention today</p>
          </div>
          <button
            onClick={() => setExecutiveMode(false)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border px-3 py-1.5 rounded-sm hover:bg-accent transition-colors"
          >
            Full View
          </button>
        </div>

        {isEmpty ? (
          <>
            <div className="grid grid-cols-4 gap-3 mb-8">
              <MetricCard label="ARR at Risk" value="—" />
              <MetricCard label="Decision Latency" value="—" sub="vs 10d target" />
              <MetricCard label="Operating Friction" value="—" />
              <MetricCard label="Agent Trust Delta" value="—" />
            </div>
            <EmptyState
              message="No strategic exposures registered."
              sub="Seed high-impact decisions to activate Executive View."
            />
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 mb-8">
              <MetricCard label="ARR at Risk" value={totalRevenueAtRisk || "—"} alert={!!totalRevenueAtRisk} />
              <MetricCard label="Decision Latency" value={`${m.decision_latency_days}d`} alert={m.decision_latency_days > 7} sub="vs 10d target" />
              <MetricCard label="Operating Friction" value={m.friction_level} alert={m.friction_level !== "Low"} danger={m.friction_level === "High"} />
              <MetricCard label="Agent Trust Delta" value={decisions.find((d) => d.solution_domain === "S3" && d.current_delta)?.current_delta || "—"} alert />
            </div>

            <section className="mb-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Top Strategic Exposures
              </h2>
              <div className="border rounded-md divide-y">
                {top3Risk.map((d) => {
                  const age = daysSince(d.created_at);
                  const exceeded = age > (d.slice_deadline_days || 10);
                  return (
                    <div key={d.id} className={cn("px-4 py-4", exceeded && "bg-signal-red/5")}>
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={d.solution_domain} />
                        <StatusBadge status={d.impact_tier} />
                        {d.decision_health && <StatusBadge status={d.decision_health} />}
                        {exceeded && (
                          <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider">
                            Exceeded {d.slice_deadline_days || 10}d window
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold">{d.title}</h3>
                      <div className="flex gap-6 text-xs text-muted-foreground mt-1">
                        <span>{d.owner}</span>
                        <span className="text-mono">{age}d old</span>
                        {d.revenue_at_risk && <span className="text-signal-amber font-semibold">{d.revenue_at_risk}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {blockedDecisions.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Blocked — Requires Escalation
                </h2>
                <div className="border border-signal-red/30 rounded-md bg-signal-red/5 divide-y divide-signal-red/10">
                  {blockedDecisions.map((d) => {
                    const age = daysSince(d.created_at);
                    return (
                      <div key={d.id} className="px-4 py-3">
                        <div className="flex items-center gap-3 mb-1">
                          <StatusBadge status={d.solution_domain} />
                          <StatusBadge status="Blocked" />
                          <span className="text-sm font-medium flex-1">{d.title}</span>
                          {age > 7 && (
                            <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider animate-pulse-slow">
                              Executive Attention Required
                            </span>
                          )}
                        </div>
                        {d.blocked_reason && <p className="text-xs text-muted-foreground">{d.blocked_reason}</p>}
                        {d.blocked_dependency_owner && (
                          <p className="text-xs text-muted-foreground">Dependency: {d.blocked_dependency_owner} · {age}d blocked</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  // Slice compliance from server data
  const sliceCompliant = m.total_active > 0 ? m.total_active - m.overdue_slices : 0;
  const slicePercent = m.total_active > 0 ? Math.round((sliceCompliant / m.total_active) * 100) : 100;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Executive Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setExecutiveMode(true)}
          className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
        >
          Executive Mode
        </button>
      </div>

      {/* Metrics — all server-computed */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        <MetricCard
          label="Active High-Impact"
          value={`${m.active_high_impact}/5`}
          alert={m.at_capacity}
          danger={m.at_capacity}
          sub={m.at_capacity ? "Authority saturated" : `${5 - m.active_high_impact} slots open`}
        />
        <MetricCard label="Blocked > 5 days" value={m.blocked_gt5_days} />
        <MetricCard label="Unlinked Signals" value={m.unlinked_signals} />
        <MetricCard
          label="Decision Latency"
          value={m.total_active ? `${m.decision_latency_days}d` : "—"}
          sub="signal → decision avg"
        />
        <MetricCard
          label="Within Slice"
          value={m.total_active ? `${slicePercent}%` : "—"}
          sub="of active decisions"
        />
      </div>

      {/* Empty guidance */}
      {isEmpty && (
        <div className="border border-dashed rounded-md px-6 py-10 text-center mb-8">
          <p className="text-sm font-medium text-muted-foreground">
            Seed up to 5 high-impact decisions to activate Authority mode.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Constraints: 5-decision hard cap · 10-day slice clock · outcome linkage required · owner required
          </p>
        </div>
      )}

      {/* Capacity Warning */}
      {m.at_capacity && (
        <div className="mb-6 border border-signal-red/40 bg-signal-red/5 rounded-md px-4 py-3">
          <p className="text-sm font-semibold text-signal-red">High-Impact Capacity Full — Decision Authority Saturated</p>
          <p className="text-xs text-signal-red/80 mt-0.5">5/5 strategic decision slots active. Close 1 to open 1.</p>
        </div>
      )}

      {/* Operating Friction — server-computed */}
      {!isEmpty && (
        <div className={cn(
          "mb-6 border rounded-md px-4 py-3",
          m.friction_level === "High" ? "border-signal-red/40 bg-signal-red/5" :
          m.friction_level === "Moderate" ? "border-signal-amber/40 bg-signal-amber/5" : ""
        )}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operating Friction</p>
              <p className={cn(
                "text-lg font-bold mt-0.5",
                m.friction_level === "High" && "text-signal-red",
                m.friction_level === "Moderate" && "text-signal-amber"
              )}>
                {m.friction_level}
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">score: {m.friction_score}</span>
          </div>
          {m.friction_drivers.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              {m.friction_drivers.map((d, i) => (
                <span key={i} className="text-xs text-muted-foreground">• {d}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Solution Drift Index */}
      {!isEmpty && (
        <div className={cn(
          "mb-8 border rounded-md px-4 py-3",
          drift.legacyGravity && "border-signal-amber/40 bg-signal-amber/5"
        )}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Solution Drift Index</p>
            {drift.legacyGravity && (
              <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider animate-pulse-slow">
                Legacy Gravity Detected
              </span>
            )}
          </div>
          <div className="flex gap-6 text-xs">
            <span>S1 · Video: <span className={cn("font-semibold text-mono", drift.s1Pct > 50 && "text-signal-amber")}>{drift.s1Pct}%</span></span>
            <span>S2 · DPI: <span className="font-semibold text-mono">{drift.s2Pct}%</span></span>
            <span>S3 · Agent: <span className="font-semibold text-mono">{drift.s3Pct}%</span></span>
          </div>
        </div>
      )}

      {/* Active Decisions */}
      {activeDecisions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Decisions</h2>
            <Link to="/decisions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
          </div>
          <div className="border rounded-md divide-y">
            {activeDecisions.slice(0, 5).map((d) => {
              const sliceRemaining = d.slice_remaining ?? 0;
              const exceeded = d.is_exceeded ?? false;
              const urgent = d.is_urgent ?? false;
              return (
                <div key={d.id} className={cn("px-4 py-3", exceeded && "bg-signal-red/5")}>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1.5 shrink-0">
                      <StatusBadge status={d.solution_domain} />
                      <StatusBadge status={d.impact_tier} />
                      {d.decision_health && <StatusBadge status={d.decision_health} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                        <span>{d.owner}</span>
                        <span>{d.surface}</span>
                        {d.revenue_at_risk && <span className="text-signal-amber font-semibold">{d.revenue_at_risk}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-semibold text-mono",
                        exceeded ? "text-signal-red" : urgent ? "text-signal-amber" : ""
                      )}>
                        {exceeded ? `${Math.abs(sliceRemaining)}d over` : `${sliceRemaining}d left`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {exceeded ? `Exceeded ${d.slice_deadline_days || 10}d window` : "slice clock"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Blocked Escalation */}
      {blockedDecisions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Blocked — Escalation Required</h2>
          <div className="border border-signal-red/30 rounded-md bg-signal-red/5 divide-y divide-signal-red/10">
            {blockedDecisions.map((d) => {
              const age = d.age_days ?? daysSince(d.created_at);
              return (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-1">
                    <StatusBadge status={d.solution_domain} />
                    <StatusBadge status="Blocked" />
                    <p className="text-sm font-medium flex-1">{d.title}</p>
                    <span className="text-xs text-mono font-semibold text-signal-red">{age}d</span>
                    {d.needs_exec_attention && (
                      <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider animate-pulse-slow">Exec Attention</span>
                    )}
                  </div>
                  {d.blocked_reason && <p className="text-xs text-muted-foreground mt-1">{d.blocked_reason}</p>}
                  {d.blocked_dependency_owner && (
                    <p className="text-xs text-muted-foreground">Dependency: {d.blocked_dependency_owner}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Signal Pressure */}
      {unlinkedSignals.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Signals Awaiting Authority</h2>
            <Link to="/signals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
          </div>
          {unlinkedSignals.length > 3 && (
            <div className="mb-3 border border-signal-amber/40 bg-signal-amber/5 rounded-md px-4 py-2">
              <p className="text-xs font-semibold text-signal-amber">
                {unlinkedSignals.length} signals without decisions — inaction is visible
              </p>
            </div>
          )}
          <div className={cn("border rounded-md divide-y", unlinkedSignals.length > 3 && "border-signal-amber/30")}>
            {unlinkedSignals.slice(0, 5).map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-4">
                {s.solution_domain && <StatusBadge status={s.solution_domain} />}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32 shrink-0">{s.type}</span>
                <p className="text-sm flex-1">{s.description}</p>
                <span className="text-xs text-muted-foreground shrink-0">{daysSince(s.created_at)}d ago</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Builder Velocity */}
      {velocity.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Builder Velocity — Last 14 Days</h2>
          <div className="border rounded-md divide-y">
            {velocity.map((v) => {
              const zeroVelocity = v.shipped === 0;
              return (
                <div key={v.name} className={cn("px-4 py-3", zeroVelocity && "bg-signal-amber/5")}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={v.solutionDomain} />
                      <p className="text-sm font-semibold">{v.name}</p>
                    </div>
                    {zeroVelocity && (
                      <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Zero velocity</span>
                    )}
                  </div>
                  <div className="flex gap-6 text-xs text-muted-foreground">
                    <span>Shipped: <span className="font-semibold text-foreground text-mono">{v.shipped}/{v.total}</span></span>
                    <span>Resolved: <span className="font-semibold text-foreground text-mono">{v.resolved}%</span></span>
                    {v.avgCycle !== null && (
                      <span>Avg cycle: <span className="font-semibold text-foreground text-mono">{v.avgCycle}d</span></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
