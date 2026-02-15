import { decisions, signals } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import { Link } from "react-router-dom";

export default function Overview() {
  const activeDecisions = decisions.filter((d) => d.status === "Active");
  const highImpactActive = activeDecisions.filter((d) => d.impactTier === "High");
  const blockedDecisions = decisions.filter(
    (d) => d.status === "Blocked" && daysSince(d.createdDate) > 5
  );
  const unlinkedSignals = signals.filter((s) => !s.decisionId);
  const avgLatency = Math.round(
    activeDecisions.reduce((sum, d) => sum + daysSince(d.createdDate), 0) /
      (activeDecisions.length || 1)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold">Executive Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <MetricCard
          label="Active High-Impact"
          value={highImpactActive.length}
          sub={`of 5 max capacity`}
          alert={highImpactActive.length >= 5}
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
        />
      </div>

      {/* Top Active Decisions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Top Active Decisions
          </h2>
          <Link to="/decisions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>
        <div className="border rounded-md divide-y">
          {activeDecisions.slice(0, 5).map((d) => {
            const age = daysSince(d.createdDate);
            return (
              <div key={d.id} className="px-4 py-3 flex items-center gap-4">
                <StatusBadge status={d.impactTier} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.owner}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold text-mono ${age > 7 ? "text-signal-amber" : ""}`}>
                    {age}d
                  </p>
                  <p className="text-[11px] text-muted-foreground">age</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Blocked */}
      {blockedDecisions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Blocked
          </h2>
          <div className="border border-signal-red/30 rounded-md bg-signal-red/5 divide-y divide-signal-red/10">
            {blockedDecisions.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center gap-4">
                <StatusBadge status="Blocked" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.owner} · {daysSince(d.createdDate)}d blocked</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New Signals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            New Signals
          </h2>
          <Link to="/signals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>
        <div className="border rounded-md divide-y">
          {unlinkedSignals.slice(0, 4).map((s) => (
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
    </div>
  );
}
