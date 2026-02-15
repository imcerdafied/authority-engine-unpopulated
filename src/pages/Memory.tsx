import { closedDecisions } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";

export default function Memory() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Closed Loop Memory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {closedDecisions.length} decisions in memory
        </p>
      </div>

      <div className="space-y-4">
        {closedDecisions.map((cd) => (
          <div key={cd.id} className="border rounded-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{cd.title}</h3>
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

            {(cd.segmentShift || cd.agentImpact) && (
              <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                {cd.segmentShift && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Segment Shift</p>
                    <p className="font-medium">{cd.segmentShift}</p>
                  </div>
                )}
                {cd.agentImpact && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Agent Impact</p>
                    <p className="font-medium">{cd.agentImpact}</p>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs border-t pt-3 mt-3">
              <p className="text-muted-foreground mb-0.5">Notes</p>
              <p>{cd.notes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
