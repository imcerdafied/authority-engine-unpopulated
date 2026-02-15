import { usePods } from "@/hooks/useOrgData";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Pods() {
  const { data: pods = [], isLoading } = usePods();

  if (isLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const isEmpty = pods.length === 0;

  const velocityStats = pods.map((pod: any) => {
    const inits = pod.pod_initiatives || [];
    const shipped = inits.filter((i: any) => i.shipped).length;
    const total = inits.length;
    const withDemo = inits.filter((i: any) => i.last_demo_date);
    const avgCycle = withDemo.length
      ? Math.round(withDemo.reduce((s: number, i: any) => s + daysSince(i.last_demo_date!), 0) / withDemo.length)
      : null;
    const resolved = total ? Math.round((shipped / total) * 100) : 0;
    return { shipped, total, avgCycle, resolved };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Builder Pods</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pods.length} pods · {pods.reduce((sum: number, p: any) => sum + (p.pod_initiatives?.length || 0), 0)} initiatives
        </p>
      </div>

      {isEmpty ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No Builder Pods Active.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Activate a pod to begin execution compression.</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground/50">
            <span>Pod Name</span>
            <span>Active Decisions</span>
            <span>Slice Status</span>
            <span>Velocity</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {pods.map((pod: any, podIdx: number) => {
            const stats = velocityStats[podIdx];
            const zeroVelocity = stats.shipped === 0;
            const inits = pod.pod_initiatives || [];

            return (
              <div key={pod.id} className="border rounded-md">
                <div className={cn("px-4 py-3 border-b", zeroVelocity ? "bg-signal-amber/5" : "bg-surface-elevated")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={pod.solution_type} />
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
                  {inits.map((init: any) => {
                    const daysSinceDemo = init.last_demo_date ? daysSince(init.last_demo_date) : null;
                    const daysToSlice = -daysSince(init.slice_deadline);
                    const sliceOverdue = daysToSlice < 0;
                    const noDemo = !init.last_demo_date;

                    return (
                      <div key={init.id} className={cn("px-4 py-3", sliceOverdue && !init.shipped && "bg-signal-red/5")}>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-medium flex-1">{init.name}</p>
                          {init.shipped && (
                            <span className="text-[11px] font-semibold text-signal-green uppercase tracking-wider">Shipped</span>
                          )}
                          {!init.outcome_linked && (
                            <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Unbound — No Outcome</span>
                          )}
                          {init.renewal_aligned && (
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Renewal-Aligned</span>
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
                            <span className={cn(
                              sliceOverdue && !init.shipped ? "text-signal-red font-semibold" :
                              daysToSlice <= 3 && !init.shipped ? "text-signal-amber font-semibold" : ""
                            )}>
                              {init.shipped ? "Delivered" : sliceOverdue ? `${Math.abs(daysToSlice)}d overdue` : `${daysToSlice}d left`}
                            </span>
                          </span>
                          {init.cross_solution_dep && (
                            <span>Dep: <span className="font-medium text-foreground">{init.cross_solution_dep}</span></span>
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
      )}
    </div>
  );
}
