import { closedDecisions } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function Memory() {
  const isEmpty = closedDecisions.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Closed Loop Memory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {closedDecisions.length} decisions in memory
        </p>
      </div>

      {isEmpty ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No closed decisions recorded.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Closed decisions create institutional memory.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {closedDecisions.map((cd) => (
            <div key={cd.id} className="border rounded-md p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={cd.solutionType} />
                  <StatusBadge status={cd.predictionAccuracy} />
                  <h3 className="text-sm font-semibold">{cd.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  Closed {daysSince(cd.closedDate)}d ago
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground mb-0.5">Expected Outcome</p>
                  <p className="font-medium">{cd.expectedOutcome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Actual Result</p>
                  <p className="font-medium">{cd.actualResult}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground mb-0.5">Prediction Accuracy</p>
                  <p className="font-semibold">{cd.predictionAccuracy}</p>
                </div>
                {cd.renewalImpact && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Renewal Impact</p>
                    <p className="font-medium">{cd.renewalImpact}</p>
                  </div>
                )}
                {cd.segmentShift && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Segment Movement</p>
                    <p className="font-medium">{cd.segmentShift}</p>
                  </div>
                )}
              </div>

              {cd.agentImpact && (
                <div className="text-xs mb-3">
                  <p className="text-muted-foreground mb-0.5">Agent Impact</p>
                  <p className="font-medium">{cd.agentImpact}</p>
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
