import { pods } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

export default function Pods() {
  const velocityStats = pods.map((pod) => {
    const shipped = pod.initiatives.filter((i) => i.shipped).length;
    const total = pod.initiatives.length;
    const withDemo = pod.initiatives.filter((i) => i.lastDemoDate);
    const avgCycle = withDemo.length
      ? Math.round(withDemo.reduce((s, i) => s + daysSince(i.lastDemoDate!), 0) / withDemo.length)
      : null;
    const resolved = total ? Math.round((shipped / total) * 100) : 0;
    return { shipped, total, avgCycle, resolved };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Builder Pods</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pods.length} pods · {pods.reduce((sum, p) => sum + p.initiatives.length, 0)} initiatives
        </p>
      </div>

      <div className="space-y-6">
        {pods.map((pod, podIdx) => {
          const stats = velocityStats[podIdx];
          const zeroVelocity = stats.shipped === 0;

          return (
            <div key={pod.id} className="border rounded-md">
              <div className={cn("px-4 py-3 border-b", zeroVelocity ? "bg-signal-amber/5" : "bg-surface-elevated")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={pod.solutionType} />
                    <div>
                      <h2 className="text-sm font-semibold">{pod.name}</h2>
                      <p className="text-xs text-muted-foreground">{pod.owner}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Shipped: <span className="font-semibold text-foreground text-mono">{stats.shipped}/{stats.total}</span></span>
                    <span>Resolved: <span className="font-semibold text-foreground text-mono">{stats.resolved}%</span></span>
                    {stats.avgCycle !== null && (
                      <span>Cycle: <span className="font-semibold text-foreground text-mono">{stats.avgCycle}d</span></span>
                    )}
                    {zeroVelocity && (
                      <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Zero velocity</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="divide-y">
                {pod.initiatives.map((init) => {
                  const daysSinceDemo = init.lastDemoDate
                    ? daysSince(init.lastDemoDate)
                    : null;
                  const daysToSlice = -daysSince(init.sliceDeadline);
                  const sliceOverdue = daysToSlice < 0;
                  const noDemo = !init.lastDemoDate;

                  return (
                    <div key={init.id} className={cn("px-4 py-3", sliceOverdue && !init.shipped && "bg-signal-red/5")}>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-sm font-medium flex-1">{init.name}</p>
                        {init.shipped && (
                          <span className="text-[11px] font-semibold text-signal-green uppercase tracking-wider">
                            Shipped
                          </span>
                        )}
                        {!init.outcomeLinked && (
                          <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">
                            Unbound — No Outcome
                          </span>
                        )}
                        {init.renewalAligned && (
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Renewal-Aligned
                          </span>
                        )}
                      </div>
                      <div className="flex gap-6 text-xs text-muted-foreground">
                        <span>Owner: {init.owner}</span>
                        <span>
                          Last demo:{" "}
                          {noDemo ? (
                            <span className="text-signal-amber font-semibold">Never</span>
                          ) : (
                            `${daysSinceDemo}d ago`
                          )}
                        </span>
                        <span>
                          Slice:{" "}
                          <span
                            className={cn(
                              sliceOverdue && !init.shipped
                                ? "text-signal-red font-semibold"
                                : daysToSlice <= 3 && !init.shipped
                                  ? "text-signal-amber font-semibold"
                                  : ""
                            )}
                          >
                            {init.shipped ? "Delivered" : sliceOverdue ? `${Math.abs(daysToSlice)}d overdue` : `${daysToSlice}d left`}
                          </span>
                        </span>
                        {init.crossSolutionDep && (
                          <span>Dep: <span className="font-medium text-foreground">{init.crossSolutionDep}</span></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
