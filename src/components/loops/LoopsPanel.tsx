import { useState } from "react";
import { useOutcomeLoops } from "@/hooks/useOutcomeLoops";
import LoopCard from "./LoopCard";
import LoopDetail from "./LoopDetail";
import CreateLoopForm from "./CreateLoopForm";
import type { OutcomeLoopComputed } from "@/hooks/useOutcomeLoops";
import { cn } from "@/lib/utils";

interface LoopsPanelProps {
  betId: string;
  canWrite: boolean;
}

export default function LoopsPanel({ betId, canWrite }: LoopsPanelProps) {
  const { data: loops = [], isLoading } = useOutcomeLoops(betId);
  const [selectedLoop, setSelectedLoop] = useState<OutcomeLoopComputed | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const activeLoops = loops.filter((l) => l.status !== "completed" && l.status !== "killed");
  const closedLoops = loops.filter((l) => l.status === "completed" || l.status === "killed");
  const [showClosed, setShowClosed] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-2">
          Outcome Loops
        </span>
        <div className="space-y-2">
          <div className="h-12 bg-muted/50 rounded-sm animate-pulse" />
          <div className="h-12 bg-muted/50 rounded-sm animate-pulse" />
        </div>
      </div>
    );
  }

  // If a loop is selected, show detail view
  if (selectedLoop) {
    // Re-fetch to get latest data
    const fresh = loops.find((l) => l.id === selectedLoop.id);
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <button
          onClick={() => setSelectedLoop(null)}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
        >
          <span>&larr;</span> Back to loops
        </button>
        <LoopDetail
          loop={fresh || selectedLoop}
          onClose={() => setSelectedLoop(null)}
          canWrite={canWrite}
        />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-3 border-t">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Outcome Loops
          {loops.length > 0 && (
            <span className="ml-1 text-[10px]">({activeLoops.length} active)</span>
          )}
        </span>
        {canWrite && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            + New Loop
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-3">
          <CreateLoopForm betId={betId} onClose={() => setShowCreate(false)} />
        </div>
      )}

      {loops.length === 0 && !showCreate && (
        <p className="text-xs text-muted-foreground italic py-2">
          No loops yet. Create one to start tracking execution cycles.
        </p>
      )}

      {activeLoops.length > 0 && (
        <div className="space-y-2">
          {activeLoops.map((loop) => (
            <LoopCard
              key={loop.id}
              loop={loop}
              onClick={() => setSelectedLoop(loop)}
            />
          ))}
        </div>
      )}

      {closedLoops.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <span className={cn("transition-transform text-[9px]", showClosed && "rotate-90")}>
              &#9654;
            </span>
            Closed ({closedLoops.length})
          </button>
          {showClosed && (
            <div className="space-y-2 mt-2">
              {closedLoops.map((loop) => (
                <LoopCard
                  key={loop.id}
                  loop={loop}
                  onClick={() => setSelectedLoop(loop)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
