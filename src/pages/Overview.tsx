import { decisions, signals, pods } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

function computeEntropy() {
  const activeDecisions = decisions.filter((d) => d.status === "Active");
  const avgAge = activeDecisions.length
    ? activeDecisions.reduce((s, d) => s + daysSince(d.createdDate), 0) / activeDecisions.length
    : 0;
  const allInits = pods.flatMap((p) => p.initiatives);
  const overdueSlices = allInits.filter((i) => !i.shipped && daysSince(i.sliceDeadline) > 0).length;
  const overduePercent = allInits.length ? (overdueSlices / allInits.length) * 100 : 0;
  const blockedCount = decisions.filter((d) => d.status === "Blocked").length;
  const unlinkedCount = signals.filter((s) => !s.decisionId).length;

  const score = (avgAge * 2) + (overduePercent * 0.5) + (blockedCount * 10) + (unlinkedCount * 5);
  const level = score > 60 ? "High" : score > 30 ? "Moderate" : "Low";
  return { score: Math.round(score), level };
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
    return { name: pod.name, shipped, total, avgCycle, resolved };
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

  // % decisions within 10-day slice
  const withinSlice = activeDecisions.filter((d) => daysSince(d.createdDate) <= (d.sliceDeadlineDays || 10));
  const slicePercent = activeDecisions.length ? Math.round((withinSlice.length / activeDecisions.length) * 100) : 100;

  const entropy = computeEntropy();
  const velocity = computeBuilderVelocity();

  // Revenue at risk
  const totalRevenueAtRisk = decisions
    .filter((d) => d.status === "Active" && d.revenueAtRisk)
    .map((d) => d.revenueAtRisk!)
    .join(" · ");

  // Executive mode: top 3 highest risk
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
            <p className="text-sm text-muted-foreground mt-1">What requires attention today</p>
          </div>
          <button
            onClick={() => setExecutiveMode(false)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border px-3 py-1.5 rounded-sm hover:bg-accent transition-colors"
          >
            Full View
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <MetricCard
            label="Revenue at Risk"
            value={totalRevenueAtRisk || "—"}
            alert={!!totalRevenueAtRisk}
          />
          <MetricCard
            label="Decision Latency"
            value={`${avgLatency}d`}
            alert={avgLatency > 7}
          />
          <MetricCard
            label="Execution Entropy"
            value={entropy.level}
            alert={entropy.level !== "Low"}
            sub={`Score: ${entropy.score}`}
          />
        </div>

        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Highest Risk Decisions
          </h2>
          <div className="border rounded-md divide-y">
            {top3Risk.map((d) => {
              const age = daysSince(d.createdDate);
              const exceeded = age > (d.sliceDeadlineDays || 10);
              return (
                <div key={d.id} className={cn("px-4 py-4", exceeded && "bg-signal-red/5")}>
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={d.impactTier} />
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
                    {d.revenueAtRisk && <span className="text-signal-amber font-semibold">{d.revenueAtRisk} at risk</span>}
                    {d.currentDelta && <span>Delta: {d.currentDelta}</span>}
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
                      <StatusBadge status="Blocked" />
                      <span className="text-sm font-medium flex-1">{d.title}</span>
                      {age > 7 && (
                        <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider animate-pulse-slow">
                          Executive Attention Required
                        </span>
                      )}
                    </div>
                    {d.blockedReason && (
                      <p className="text-xs text-muted-foreground">{d.blockedReason}</p>
                    )}
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
          <p className="text-sm font-semibold text-signal-red">Capacity full — no new high-impact decisions allowed</p>
          <p className="text-xs text-signal-red/80 mt-0.5">You must close 1 to open 1. {highImpactActive.length}/5 high-impact slots occupied.</p>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        <MetricCard
          label="Active High-Impact"
          value={`${highImpactActive.length}/5`}
          alert={atCapacity}
          sub={atCapacity ? "At capacity" : `${5 - highImpactActive.length} slots open`}
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
          sub="rolling avg"
          alert={avgLatency > 7}
        />
        <MetricCard
          label="Within 10d Slice"
          value={`${slicePercent}%`}
          sub="of active decisions"
          alert={slicePercent < 70}
        />
      </div>

      {/* Execution Entropy */}
      <div className={cn(
        "mb-8 border rounded-md px-4 py-3 flex items-center justify-between",
        entropy.level === "High" ? "border-signal-red/40 bg-signal-red/5" :
        entropy.level === "Moderate" ? "border-signal-amber/40 bg-signal-amber/5" : ""
      )}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Execution Entropy</p>
          <p className={cn(
            "text-lg font-bold mt-0.5",
            entropy.level === "High" && "text-signal-red",
            entropy.level === "Moderate" && "text-signal-amber"
          )}>
            {entropy.level}
          </p>
        </div>
        <p className="text-xs text-muted-foreground max-w-xs text-right">
          Derived from decision age, overdue slices, blocked decisions, and unlinked signals.
        </p>
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
                  <StatusBadge status={d.impactTier} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                      <span>{d.owner}</span>
                      {d.outcomeCategory && <span>{d.outcomeCategory}</span>}
                      {d.currentDelta && <span>Delta: {d.currentDelta}</span>}
                      {!d.outcomeCategory && (
                        <span className="text-signal-amber font-semibold">Unbound — no authority</span>
                      )}
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
                    <StatusBadge status="Blocked" />
                    <p className="text-sm font-medium flex-1">{d.title}</p>
                    <span className="text-xs text-mono font-semibold text-signal-red">{age}d</span>
                    {execAttention && (
                      <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider animate-pulse-slow">
                        Exec Attention
                      </span>
                    )}
                  </div>
                  {d.blockedReason && (
                    <p className="text-xs text-muted-foreground mt-1">Reason: {d.blockedReason}</p>
                  )}
                  {d.blockedDependencyOwner && (
                    <p className="text-xs text-muted-foreground">Dependency owner: {d.blockedDependencyOwner}</p>
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
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28 shrink-0">
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
                  <p className="text-sm font-semibold">{v.name}</p>
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
