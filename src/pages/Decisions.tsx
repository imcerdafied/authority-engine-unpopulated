import { decisions } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

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
      </div>

      {atCapacity && (
        <div className="mb-6 border border-signal-red/40 bg-signal-red/5 rounded-md px-4 py-3">
          <p className="text-sm font-semibold text-signal-red">High-Impact Capacity Full — Decision Authority Saturated</p>
          <p className="text-xs text-signal-red/80 mt-0.5">5/5 strategic decision slots active. Close 1 to open 1.</p>
        </div>
      )}

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
                const sliceMax = d.sliceDeadlineDays || 10;
                const sliceRemaining = sliceMax - age;
                const exceeded = sliceRemaining < 0;
                const urgent = sliceRemaining >= 0 && sliceRemaining <= 3;
                const unboundOutcome = !d.outcomeCategory;
                const isBlocked = d.status === "Blocked";
                const execAttention = isBlocked && age > 7;

                return (
                  <div
                    key={d.id}
                    className={cn(
                      "border rounded-md p-4",
                      exceeded ? "border-signal-red/40 bg-signal-red/5" :
                      aging ? "border-signal-amber/40" : ""
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <StatusBadge status={d.solutionType} />
                      <StatusBadge status={d.impactTier} />
                      <StatusBadge status={d.status} />
                      {d.decisionHealth && <StatusBadge status={d.decisionHealth} />}
                      {d.status === "Active" && (
                        <span className={cn(
                          "text-[11px] font-semibold uppercase tracking-wider",
                          exceeded ? "text-signal-red" : urgent ? "text-signal-amber" : "text-muted-foreground"
                        )}>
                          {exceeded ? `Exceeded ${sliceMax}d build window` : `Slice due in ${sliceRemaining}d`}
                        </span>
                      )}
                      {aging && (
                        <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider animate-pulse-slow">
                          Aging
                        </span>
                      )}
                      {unboundOutcome && (
                        <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider ml-auto">
                          Unbound — no authority
                        </span>
                      )}
                      {execAttention && (
                        <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider ml-auto animate-pulse-slow">
                          Executive Attention Required
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold mb-1">{d.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{d.triggerSignal}</p>

                    {/* Solution & Surface */}
                    <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                      <div>
                        <span className="text-muted-foreground">Surface</span>
                        <p className="font-medium mt-0.5">{d.surface}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Outcome Target</span>
                        <p className="font-medium mt-0.5">{d.outcomeTarget}</p>
                      </div>
                      {d.outcomeCategory && (
                        <div>
                          <span className="text-muted-foreground">Category</span>
                          <p className="font-medium mt-0.5">{d.outcomeCategory}</p>
                        </div>
                      )}
                      {d.expectedImpact && (
                        <div>
                          <span className="text-muted-foreground">Expected Impact</span>
                          <p className="font-medium mt-0.5">{d.expectedImpact}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                      {d.currentDelta && (
                        <div>
                          <span className="text-muted-foreground">Current Delta</span>
                          <p className="font-semibold mt-0.5 text-signal-amber">{d.currentDelta}</p>
                        </div>
                      )}
                      {d.revenueAtRisk && (
                        <div>
                          <span className="text-muted-foreground">Enterprise Exposure</span>
                          <p className="font-semibold mt-0.5 text-signal-red">{d.revenueAtRisk}</p>
                        </div>
                      )}
                      {d.segmentImpact && (
                        <div>
                          <span className="text-muted-foreground">Segment</span>
                          <p className="font-medium mt-0.5">{d.segmentImpact}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Owner</span>
                        <p className="font-medium mt-0.5">{d.owner}</p>
                      </div>
                    </div>

                    <div className="flex gap-6 text-xs">
                      <div>
                        <span className="text-muted-foreground">Age</span>
                        <p className={cn("font-semibold text-mono mt-0.5", aging && "text-signal-amber")}>
                          {age} days
                        </p>
                      </div>
                    </div>

                    {/* Blocked details */}
                    {isBlocked && d.blockedReason && (
                      <div className="mt-3 pt-3 border-t text-xs">
                        <p className="text-muted-foreground">Blocked: {d.blockedReason}</p>
                        {d.blockedDependencyOwner && (
                          <p className="text-muted-foreground mt-0.5">Dependency: {d.blockedDependencyOwner}</p>
                        )}
                      </div>
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
