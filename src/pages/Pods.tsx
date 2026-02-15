import { pods } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";

export default function Pods() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Builder Pods</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pods.length} pods · {pods.reduce((sum, p) => sum + p.initiatives.length, 0)} initiatives
        </p>
      </div>

      <div className="space-y-6">
        {pods.map((pod) => (
          <div key={pod.id} className="border rounded-md">
            <div className="px-4 py-3 border-b bg-surface-elevated">
              <h2 className="text-sm font-semibold">{pod.name}</h2>
              <p className="text-xs text-muted-foreground">{pod.owner}</p>
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
                  <div key={init.id} className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-medium flex-1">{init.name}</p>
                      {init.shipped && (
                        <span className="text-[11px] font-semibold text-signal-green uppercase tracking-wider">
                          Shipped
                        </span>
                      )}
                      {!init.outcomeLinked && (
                        <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">
                          No Outcome
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
                          className={
                            sliceOverdue
                              ? "text-signal-red font-semibold"
                              : daysToSlice <= 3
                                ? "text-signal-amber font-semibold"
                                : ""
                          }
                        >
                          {sliceOverdue ? `${Math.abs(daysToSlice)}d overdue` : `${daysToSlice}d left`}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
