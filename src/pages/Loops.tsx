import { useState } from "react";
import { useOutcomeLoops, type OutcomeLoopComputed, type LoopStatus } from "@/hooks/useOutcomeLoops";
import { useDecisions } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import LoopCard from "@/components/loops/LoopCard";
import LoopDetail from "@/components/loops/LoopDetail";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: LoopStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "proposed", label: "Proposed" },
  { value: "active", label: "Active" },
  { value: "iterating", label: "Iterating" },
  { value: "completed", label: "Completed" },
  { value: "killed", label: "Killed" },
];

export default function Loops() {
  const { data: loops = [], isLoading } = useOutcomeLoops();
  const { data: decisions = [] } = useDecisions();
  const { currentRole } = useOrg();
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const [statusFilter, setStatusFilter] = useState<LoopStatus | "">("");
  const [betFilter, setBetFilter] = useState("");
  const [selectedLoop, setSelectedLoop] = useState<OutcomeLoopComputed | null>(null);

  const filteredLoops = loops.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (betFilter && l.bet_id !== betFilter) return false;
    return true;
  });

  const activeCount = loops.filter((l) => l.status === "active" || l.status === "iterating").length;
  const staleCount = loops.filter((l) => l.is_stale).length;
  const needsDecisionCount = loops.filter((l) => l.has_no_decision).length;

  const betMap = new Map(decisions.map((d) => [d.id, d.title]));
  const betsWithLoops = Array.from(new Set(loops.map((l) => l.bet_id)));

  if (isLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  if (selectedLoop) {
    const fresh = loops.find((l) => l.id === selectedLoop.id);
    return (
      <div>
        <button
          onClick={() => setSelectedLoop(null)}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
        >
          <span>&larr;</span> Back to all loops
        </button>
        <div className="mb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Bet: {betMap.get(selectedLoop.bet_id) || "Unknown"}
          </span>
        </div>
        <LoopDetail
          loop={fresh || selectedLoop}
          onClose={() => setSelectedLoop(null)}
          canWrite={canWrite}
        />
      </div>
    );
  }

  const selectClass = "text-xs border rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Outcome Loops</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {loops.length} total · {activeCount} active
              {staleCount > 0 && <span className="text-signal-amber"> · {staleCount} stale</span>}
              {needsDecisionCount > 0 && <span className="text-signal-red"> · {needsDecisionCount} need decision</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LoopStatus | "")}
              className={selectClass}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            {betsWithLoops.length > 1 && (
              <select
                value={betFilter}
                onChange={(e) => setBetFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Bets</option>
                {betsWithLoops.map((betId) => (
                  <option key={betId} value={betId}>
                    {betMap.get(betId) || "Unknown Bet"}
                  </option>
                ))}
              </select>
            )}
            {(statusFilter || betFilter) && (
              <button
                onClick={() => { setStatusFilter(""); setBetFilter(""); }}
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border rounded-sm px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
            What are we working on?
          </span>
          <span className="text-lg font-bold tabular-nums">{activeCount}</span>
          <span className="text-xs text-muted-foreground ml-1">active loops</span>
        </div>
        <div className="border rounded-sm px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
            What happened?
          </span>
          <span className="text-lg font-bold tabular-nums">
            {loops.filter((l) => l.last_ship_summary).length}
          </span>
          <span className="text-xs text-muted-foreground ml-1">have shipped</span>
        </div>
        <div className="border rounded-sm px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
            What&apos;s next?
          </span>
          <span className="text-lg font-bold tabular-nums">
            {loops.filter((l) => l.current_decision !== "unclear" && (l.status === "active" || l.status === "iterating")).length}
          </span>
          <span className="text-xs text-muted-foreground ml-1">with clear decisions</span>
        </div>
      </div>

      {/* Loop list grouped by bet */}
      {filteredLoops.length === 0 ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No loops found.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Create outcome loops from within a bet to start tracking execution cycles.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {betsWithLoops
            .filter((betId) => !betFilter || betId === betFilter)
            .map((betId) => {
              const betLoops = filteredLoops.filter((l) => l.bet_id === betId);
              if (betLoops.length === 0) return null;
              return (
                <div key={betId}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {betMap.get(betId) || "Unknown Bet"}
                  </p>
                  <div className="space-y-2">
                    {betLoops.map((loop) => (
                      <LoopCard
                        key={loop.id}
                        loop={loop}
                        onClick={() => setSelectedLoop(loop)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
