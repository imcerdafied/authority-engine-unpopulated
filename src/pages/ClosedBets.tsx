import { useDecisions } from "@/hooks/useOrgData";
import { isClosedBetLifecycle } from "@/lib/bet-status";

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClosedBets() {
  const { data: decisions = [], isLoading } = useDecisions();

  if (isLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const closed = decisions
    .filter((d) => isClosedBetLifecycle(d.status))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div className="space-y-4">
      <div className="border rounded-md p-4 md:p-5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Archive</p>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Closed Bets</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Bets moved here when status is set to closed.
        </p>
      </div>

      {closed.length === 0 ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No closed bets yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {closed.map((d, idx) => (
            <div key={d.id} className="border rounded-md overflow-hidden">
              <div className="px-4 md:px-5 py-3 border-b bg-muted/30">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <p className="text-base font-semibold">
                    {idx + 1}. {d.title || "Untitled"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Closed {formatDate(d.updated_at)}
                  </p>
                </div>
              </div>
              <div className="px-4 md:px-5 py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Category</p>
                  <p>{d.outcome_category_key || d.outcome_category || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Owner</p>
                  <p>{d.owner || "TBD"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Domain</p>
                  <p>{d.solution_domain || "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
