import { decisions, signals, pods } from "@/lib/mock-data";
import { daysSince, SolutionType } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

function computeOperatingFriction() {
  const activeDecisions = decisions.filter((d) => d.status === "Active");
  const avgAge = activeDecisions.length
    ? activeDecisions.reduce((s, d) => s + daysSince(d.createdDate), 0) / activeDecisions.length
    : 0;
  const allInits = pods.flatMap((p) => p.initiatives);
  const overdueSlices = allInits.filter((i) => !i.shipped && daysSince(i.sliceDeadline) > 0).length;
  const overduePercent = allInits.length ? (overdueSlices / allInits.length) * 100 : 0;
  const blockedCount = decisions.filter((d) => d.status === "Blocked").length;
  const unlinkedCount = signals.filter((s) => !s.decisionId).length;
  const renewalAging = decisions.filter((d) => d.status === "Active" && d.outcomeCategory === "Enterprise Renewal" && daysSince(d.createdDate) > 7).length;
  const crossConflicts = signals.filter((s) => s.type === "Cross-Solution Conflict" && !s.decisionId).length;

  const score = (avgAge * 2) + (overduePercent * 0.5) + (blockedCount * 10) + (unlinkedCount * 5) + (renewalAging * 8) + (crossConflicts * 7);
  const level = score > 60 ? "High" : score > 30 ? "Moderate" : "Low";

  const drivers: string[] = [];
  if (overdueSlices > 0) drivers.push(`${overdueSlices} overdue slices`);
  if (renewalAging > 0) drivers.push(`${renewalAging} renewal decision aging`);
  if (unlinkedCount > 0) drivers.push(`${unlinkedCount} unlinked signals`);
  if (crossConflicts > 0) drivers.push(`${crossConflicts} cross-solution conflicts`);
  if (blockedCount > 0) drivers.push(`${blockedCount} blocked decisions`);

  return { score: Math.round(score), level, drivers };
}

function computeSolutionDrift() {
  const active = decisions.filter((d) => d.status === "Active");
  const counts: Record<SolutionType, number> = { S1: 0, S2: 0, S3: 0, "Cross-Solution": 0 };
  active.forEach((d) => { counts[d.solutionType]++; });
  const total = active.length || 1;
  const s1Pct = Math.round((counts.S1 / total) * 100);
  const s2Pct = Math.round((counts.S2 / total) * 100);
  const s3Pct = Math.round((counts.S3 / total) * 100);
  const legacyGravity = s1Pct > 50;
  return { s1Pct, s2Pct, s3Pct, counts, legacyGravity };
}

function computeBuilderVelocity() {
  return pods.map((pod) => {
    const shipped = pod.initiatives.filter((i) => i.shipped).length;
    const total = pod.initiatives.length;
    const withDemo = pod.initiatives.filter((i) => i.lastDemoDate);
    const avgCycle = withDemo.length
      ? Math.round(withDemo.reduce((s, i) => s + daysSince(i.lastDemoDate!), 0) / withDemo.length)
      : null;
    const resolved = total ? Math.round((shipped / total) * 100) : 0;
    return { name: pod.name, solutionType: pod.solutionType, shipped, total, avgCycle, resolved };
  });
}

export default function Overview() {
  const [executiveMode, setExecutiveMode] = useState(false);

  const activeDecisions = decisions.filter((d) => d.status === "Active");
  const highImpactActive = activeDecisions.filter((d) => d.impactTier === "High");
  const atCapacity = highImpactActive.length >= 5;
  const blockedDecisions = decisions.filter(
    (d) => d.status === "Blocked" && daysSince(d.createdDate) > 5
  );
  const unlinkedSignals = signals.filter((s) => !s.decisionId);
  const avgLatency = Math.round(
    activeDecisions.reduce((sum, d) => sum + daysSince(d.createdDate), 0) /
      (activeDecisions.length || 1)
  );

  const withinSlice = activeDecisions.filter((d) => daysSince(d.createdDate) <= (d.sliceDeadlineDays || 10));
  const slicePercent = activeDecisions.length ? Math.round((withinSlice.length / activeDecisions.length) * 100) : 100;

  const friction = computeOperatingFriction();
  const drift = computeSolutionDrift();
  const velocity = computeBuilderVelocity();

  const totalRevenueAtRisk = decisions
    .filter((d) => d.status === "Active" && d.revenueAtRisk)
    .map((d) => d.revenueAtRisk!)
    .join(" · ");

  const top3Risk = [...activeDecisions]
    .sort((a, b) => {
      const tierOrder = { High: 0, Medium: 1, Low: 2 };
      if (tierOrder[a.impactTier] !== tierOrder[b.impactTier]) return tierOrder[a.impactTier] - tierOrder[b.impactTier];
      return daysSince(b.createdDate) - daysSince(a.createdDate);
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

        <div className="grid grid-cols-4 gap-3 mb-8">
          <MetricCard
            label="ARR at Risk"
            value={totalRevenueAtRisk || "—"}
            alert={!!totalRevenueAtRisk}
          />
          <MetricCard
            label="Decision Latency"
            value={`${avgLatency}d`}
            alert={avgLatency > 7}
            sub="vs 10d target"
          />
          <MetricCard
            label="Operating Friction"
            value={friction.level}
            alert={friction.level !== "Low"}
            danger={friction.level === "High"}
          />
          <MetricCard
            label="Agent Trust Delta"
            value={decisions.find((d) => d.solutionType === "S3" && d.currentDelta)?.currentDelta || "—"}
            alert
          />
        </div>

        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Top Strategic Exposures
          </h2>
          <div className="border rounded-md divide-y">
            {top3Risk.map((d) => {
              const age = daysSince(d.createdDate);
              const exceeded = age > (d.sliceDeadlineDays || 10);
              return (
                <div key={d.id} className={cn("px-4 py-4", exceeded && "bg-signal-red/5")}>
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={d.solutionType} />
                    <StatusBadge status={d.impactTier} />
                    {d.decisionHealth && <StatusBadge status={d.decisionHealth} />}
                    {exceeded && (
                      <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider">
                        Exceeded {d.sliceDeadlineDays || 10}d window
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold">{d.title}</h3>
                  <div className="flex gap-6 text-xs text-muted-foreground mt-1">
                    <span>{d.owner}</span>
                    <span className="text-mono">{age}d old</span>
                    {d.revenueAtRisk && <span className="text-signal-amber font-semibold">{d.revenueAtRisk}</span>}
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
                const age = daysSince(d.createdDate);
                return (
                  <div key={d.id} className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-1">
                      <StatusBadge status={d.solutionType} />
                      <StatusBadge status="Blocked" />
                      <span className="text-sm font-medium flex-1">{d.title}</span>
                      {age > 7 && (
                        <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider animate-pulse-slow">
                          Executive Attention Required
                        </span>
                      )}
                    </div>
                    {d.blockedReason && <p className="text-xs text-muted-foreground">{d.blockedReason}</p>}
                    {d.blockedDependencyOwner && (
                      <p className="text-xs text-muted-foreground">Dependency: {d.blockedDependencyOwner} · {age}d blocked</p>
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

      {/* Capacity Warning */}
      {atCapacity && (
        <div className="mb-6 border border-signal-red/40 bg-signal-red/5 rounded-md px-4 py-3">
          <p className="text-sm font-semibold text-signal-red">High-Impact Capacity Full — Decision Authority Saturated</p>
          <p className="text-xs text-signal-red/80 mt-0.5">5/5 strategic decision slots active. Close 1 to open 1.</p>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        <MetricCard
          label="Active High-Impact"
          value={`${highImpactActive.length}/5`}
          alert={atCapacity}
          danger={atCapacity}
          sub={atCapacity ? "Authority saturated" : `${5 - highImpactActive.length} slots open`}
        />
        <MetricCard
          label="Blocked > 5 days"
          value={blockedDecisions.length}
          alert={blockedDecisions.length > 0}
        />
        <MetricCard
          label="Unlinked Signals"
          value={unlinkedSignals.length}
          alert={unlinkedSignals.length > 3}
        />
        <MetricCard
          label="Decision Latency"
          value={`${avgLatency}d`}
          sub="vs 10d target"
          alert={avgLatency > 7}
        />
        <MetricCard
          label="Within 10d Slice"
          value={`${slicePercent}%`}
          sub="of active decisions"
          alert={slicePercent < 70}
        />
      </div>

      {/* Operating Friction */}
      <div className={cn(
        "mb-6 border rounded-md px-4 py-3",
        friction.level === "High" ? "border-signal-red/40 bg-signal-red/5" :
        friction.level === "Moderate" ? "border-signal-amber/40 bg-signal-amber/5" : ""
      )}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operating Friction</p>
            <p className={cn(
              "text-lg font-bold mt-0.5",
              friction.level === "High" && "text-signal-red",
              friction.level === "Moderate" && "text-signal-amber"
            )}>
              {friction.level}
            </p>
          </div>
        </div>
        {friction.drivers.length > 0 && (
          <div className="flex gap-4 flex-wrap">
            {friction.drivers.map((d, i) => (
              <span key={i} className="text-xs text-muted-foreground">• {d}</span>
            ))}
          </div>
        )}
      </div>

      {/* Solution Drift Index */}
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

      {/* Top Active Decisions with Clocks */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active Decisions
          </h2>
          <Link to="/decisions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>
        <div className="border rounded-md divide-y">
          {activeDecisions.slice(0, 5).map((d) => {
            const age = daysSince(d.createdDate);
            const sliceMax = d.sliceDeadlineDays || 10;
            const sliceRemaining = sliceMax - age;
            const exceeded = sliceRemaining < 0;
            const urgent = sliceRemaining >= 0 && sliceRemaining <= 3;
            return (
              <div key={d.id} className={cn("px-4 py-3", exceeded && "bg-signal-red/5")}>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5 shrink-0">
                    <StatusBadge status={d.solutionType} />
                    <StatusBadge status={d.impactTier} />
                    {d.decisionHealth && <StatusBadge status={d.decisionHealth} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                      <span>{d.owner}</span>
                      <span>{d.surface}</span>
                      {d.revenueAtRisk && <span className="text-signal-amber font-semibold">{d.revenueAtRisk}</span>}
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
                      {exceeded ? `Exceeded ${sliceMax}d window` : "slice clock"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Blocked Escalation */}
      {blockedDecisions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Blocked — Escalation Required
          </h2>
          <div className="border border-signal-red/30 rounded-md bg-signal-red/5 divide-y divide-signal-red/10">
            {blockedDecisions.map((d) => {
              const age = daysSince(d.createdDate);
              const execAttention = age > 7;
              return (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-1">
                    <StatusBadge status={d.solutionType} />
                    <StatusBadge status="Blocked" />
                    <p className="text-sm font-medium flex-1">{d.title}</p>
                    <span className="text-xs text-mono font-semibold text-signal-red">{age}d</span>
                    {execAttention && (
                      <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider animate-pulse-slow">
                        Exec Attention
                      </span>
                    )}
                  </div>
                  {d.blockedReason && <p className="text-xs text-muted-foreground mt-1">{d.blockedReason}</p>}
                  {d.blockedDependencyOwner && (
                    <p className="text-xs text-muted-foreground">Dependency: {d.blockedDependencyOwner}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Signal Pressure */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Signals Awaiting Authority
          </h2>
          <Link to="/signals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>
        {unlinkedSignals.length > 3 && (
          <div className="mb-3 border border-signal-amber/40 bg-signal-amber/5 rounded-md px-4 py-2">
            <p className="text-xs font-semibold text-signal-amber">
              {unlinkedSignals.length} signals without decisions — inaction is visible
            </p>
          </div>
        )}
        <div className={cn(
          "border rounded-md divide-y",
          unlinkedSignals.length > 3 && "border-signal-amber/30"
        )}>
          {unlinkedSignals.slice(0, 5).map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-4">
              {s.solutionType && <StatusBadge status={s.solutionType} />}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32 shrink-0">
                {s.type}
              </span>
              <p className="text-sm flex-1">{s.description}</p>
              <span className="text-xs text-muted-foreground shrink-0">
                {daysSince(s.createdDate)}d ago
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Builder Velocity */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Builder Velocity — Last 14 Days
        </h2>
        <div className="border rounded-md divide-y">
          {velocity.map((v) => {
            const zeroVelocity = v.shipped === 0;
            return (
              <div key={v.name} className={cn("px-4 py-3", zeroVelocity && "bg-signal-amber/5")}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={v.solutionType} />
                    <p className="text-sm font-semibold">{v.name}</p>
                  </div>
                  {zeroVelocity && (
                    <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">
                      Zero velocity
                    </span>
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
    </div>
  );
}
