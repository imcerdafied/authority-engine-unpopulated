import { useClosedDecisions } from "@/hooks/useOrgData";
import StatusBadge from "@/components/StatusBadge";

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Memory() {
  const { data: closedDecisions = [], isLoading } = useClosedDecisions();

  if (isLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const isEmpty = closedDecisions.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Closed Loop Memory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {closedDecisions.length} bets in memory
        </p>
      </div>

      {isEmpty ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No closed decisions recorded.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Closed decisions create institutional memory.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {closedDecisions.map((cd) => (
            <div key={cd.id} className="border rounded-md p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={cd.solution_domain} />
                  <StatusBadge status={cd.prediction_accuracy} />
                  <h3 className="text-sm font-semibold">{cd.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  Closed {daysSince(cd.closed_date)}d ago
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground mb-0.5">Expected Outcome</p>
                  <p className="font-medium">{cd.expected_outcome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Actual Result</p>
                  <p className="font-medium">{cd.actual_result}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground mb-0.5">Prediction Accuracy</p>
                  <p className="font-semibold">{cd.prediction_accuracy}</p>
                </div>
                {cd.renewal_impact && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Renewal Impact</p>
                    <p className="font-medium">{cd.renewal_impact}</p>
                  </div>
                )}
                {cd.segment_shift && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Segment Movement</p>
                    <p className="font-medium">{cd.segment_shift}</p>
                  </div>
                )}
              </div>

              {cd.agent_impact && (
                <div className="text-xs mb-3">
                  <p className="text-muted-foreground mb-0.5">Agent Impact</p>
                  <p className="font-medium">{cd.agent_impact}</p>
                </div>
              )}

              <div className="text-xs border-t pt-3 mt-3">
                <p className="text-muted-foreground mb-0.5">Notes</p>
                <p>{cd.notes}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
