import { useState } from "react";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useInitiatives } from "@/hooks/useInitiatives";
import { cn } from "@/lib/utils";

interface ScoreHistoryProps {
  betId: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TRIGGER_LABELS: Record<string, string> = {
  INITIATIVE_ADDED: "Initiative added",
  INITIATIVE_UPDATED: "Initiative updated",
  INITIATIVE_DELETED: "Initiative deleted",
  BET_METRIC_UPDATED: "Metric changed",
};

export default function ScoreHistory({ betId }: ScoreHistoryProps) {
  const { data: history = [], isLoading } = useScoreHistory(betId);
  const { data: initiatives = [] } = useInitiatives(betId);
  const [open, setOpen] = useState(false);

  const initMap = new Map(initiatives.map((i) => [i.id, i.description]));

  if (isLoading || history.length === 0) {
    return null;
  }

  return (
    <div className="px-4 md:px-6 py-3 border-t">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="text-[10px]">{open ? "▼" : "▶"}</span>
        What Moved ({history.length})
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {history.map((entry) => {
            const scoreDelta = entry.new_score - entry.previous_score;
            const rankImproved = entry.new_rank < entry.previous_rank;
            const rankDeclined = entry.new_rank > entry.previous_rank;
            const desc = initMap.get(entry.initiative_id) ?? "Unknown initiative";
            const truncDesc = desc.length > 50 ? desc.slice(0, 50) + "…" : desc;

            return (
              <div key={entry.id} className="flex items-start gap-2 text-[11px]">
                <span className="text-muted-foreground/60 tabular-nums whitespace-nowrap min-w-[3.5rem] text-right">
                  {relativeTime(entry.calculated_at)}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground">
                    {TRIGGER_LABELS[entry.trigger_event] ?? entry.trigger_event}
                  </span>
                  <span className="text-foreground/70 mx-1">·</span>
                  <span className="text-foreground/80 truncate">{truncDesc}</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={cn(
                      "tabular-nums",
                      rankImproved ? "text-signal-green" : rankDeclined ? "text-signal-red" : "text-muted-foreground"
                    )}>
                      Rank {entry.previous_rank} → {entry.new_rank}
                    </span>
                    <span className={cn(
                      "tabular-nums",
                      scoreDelta > 0 ? "text-signal-green" : scoreDelta < 0 ? "text-signal-red" : "text-muted-foreground"
                    )}>
                      {scoreDelta > 0 ? "+" : ""}{scoreDelta.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
