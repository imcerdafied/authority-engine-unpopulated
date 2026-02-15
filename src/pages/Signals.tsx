import { signals } from "@/lib/mock-data";
import { daysSince, SignalType } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

const signalTypeLabels: SignalType[] = [
  "KPI Deviation",
  "Segment Variance",
  "Agent Drift",
  "Exec Escalation",
  "Launch Milestone",
  "Renewal Risk",
  "Cross-Solution Conflict",
];

export default function Signals() {
  const unlinked = signals.filter((s) => !s.decisionId);
  const severe = unlinked.length > 3;
  const isEmpty = signals.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Signal Intake</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {signals.length} signals · {unlinked.length} unlinked
        </p>
      </div>

      {/* Pressure banner */}
      {unlinked.length > 0 && (
        <div className={cn(
          "mb-6 border rounded-md px-4 py-3",
          severe ? "border-signal-red/40 bg-signal-red/5" : "border-signal-amber/40 bg-signal-amber/5"
        )}>
          <p className={cn(
            "text-sm font-semibold",
            severe ? "text-signal-red" : "text-signal-amber"
          )}>
            {unlinked.length} signals awaiting authority
          </p>
          {severe && (
            <p className="text-xs text-signal-red/80 mt-0.5">
              Signal backlog exceeds threshold — decisions required
            </p>
          )}
        </div>
      )}

      {/* Signal type legend */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {signalTypeLabels.map((type) => (
          <span
            key={type}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border rounded-sm px-2 py-1"
          >
            {type}
          </span>
        ))}
      </div>

      {isEmpty ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No signals awaiting authority.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Signals can be added manually or via integration.
          </p>
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {signals.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-center gap-3 mb-2">
                {s.solutionType && <StatusBadge status={s.solutionType} />}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
                  {s.type}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {daysSince(s.createdDate)}d ago · {s.source}
                </span>
                {!s.decisionId && (
                  <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider ml-auto">
                    Needs Decision
                  </span>
                )}
                {s.decisionId && (
                  <span className="text-[11px] text-signal-green font-semibold uppercase tracking-wider ml-auto">
                    Linked
                  </span>
                )}
              </div>
              <p className="text-sm">{s.description}</p>
              {!s.decisionId && (
                <button className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-2 py-1 rounded-sm hover:bg-foreground hover:text-background transition-colors">
                  Spawn Decision →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
