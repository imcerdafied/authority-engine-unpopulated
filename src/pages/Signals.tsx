import { signals } from "@/lib/mock-data";
import { daysSince, SignalType } from "@/lib/types";

const signalTypeLabels: SignalType[] = [
  "KPI Deviation",
  "Segment Variance",
  "Agent Drift",
  "Exec Escalation",
  "Launch Milestone",
];

export default function Signals() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Signal Intake</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {signals.length} signals · {signals.filter((s) => !s.decisionId).length} unlinked
        </p>
      </div>

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

      {/* Signals list */}
      <div className="border rounded-md divide-y">
        {signals.map((s) => (
          <div key={s.id} className="p-4">
            <div className="flex items-center gap-3 mb-2">
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
          </div>
        ))}
      </div>
    </div>
  );
}
