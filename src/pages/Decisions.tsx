import { decisions } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function Decisions() {
  const grouped = {
    Active: decisions.filter((d) => d.status === "Active"),
    Blocked: decisions.filter((d) => d.status === "Blocked"),
    Draft: decisions.filter((d) => d.status === "Draft"),
  };

  const highActive = grouped.Active.filter((d) => d.impactTier === "High").length;
  const atCapacity = highActive >= 5;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Decisions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {decisions.length} total · {grouped.Active.length} active
          </p>
        </div>
        {atCapacity && (
          <div className="text-xs font-semibold text-signal-amber border border-signal-amber/30 bg-signal-amber/5 px-3 py-1.5 rounded-sm uppercase tracking-wider">
            High-impact at capacity (5/5)
          </div>
        )}
      </div>

      {(["Active", "Blocked", "Draft"] as const).map((status) => {
        const items = grouped[status];
        if (items.length === 0) return null;
        return (
          <section key={status} className="mb-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {status} ({items.length})
            </h2>
            <div className="space-y-2">
              {items.map((d) => {
                const age = daysSince(d.createdDate);
                const aging = age > 7;
                return (
                  <div
                    key={d.id}
                    className={`border rounded-md p-4 ${aging ? "border-signal-amber/40" : ""}`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <StatusBadge status={d.impactTier} />
                      <StatusBadge status={d.status} />
                      {aging && (
                        <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider animate-pulse-slow">
                          Aging
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mb-1">{d.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {d.triggerSignal}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Outcome Target</span>
                        <p className="font-medium mt-0.5">{d.outcomeTarget}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Owner</span>
                        <p className="font-medium mt-0.5">{d.owner}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Age</span>
                        <p className={`font-semibold text-mono mt-0.5 ${aging ? "text-signal-amber" : ""}`}>
                          {age} days
                        </p>
                      </div>
                    </div>
                    {d.segmentImpact && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Segment: {d.segmentImpact}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
