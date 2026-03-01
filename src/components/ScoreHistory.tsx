import { useState, useMemo } from "react";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useInitiatives } from "@/hooks/useInitiatives";
import { cn } from "@/lib/utils";
import type { ScoreHistoryEntry } from "@/lib/types";

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
  BET_METRIC_UPDATED: "Metric updated",
};

type FilterKey = "all" | "metric" | "initiative";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "metric", label: "Metric changes" },
  { key: "initiative", label: "Initiative edits" },
];

const METRIC_TRIGGERS = new Set(["BET_METRIC_UPDATED"]);
const INITIATIVE_TRIGGERS = new Set([
  "INITIATIVE_ADDED",
  "INITIATIVE_UPDATED",
  "INITIATIVE_DELETED",
]);

interface RecalcGroup {
  timestamp: string;
  triggerEvent: string;
  entries: ScoreHistoryEntry[];
}

/**
 * Group entries by recalculation event.
 * Entries that happened within 2 seconds of each other with the same
 * trigger_event are considered part of the same recalculation.
 */
function groupByRecalc(history: ScoreHistoryEntry[]): RecalcGroup[] {
  if (history.length === 0) return [];

  const groups: RecalcGroup[] = [];
  let current: RecalcGroup | null = null;

  // history is already ordered by calculated_at DESC
  for (const entry of history) {
    const entryTime = new Date(entry.calculated_at).getTime();
    if (
      current &&
      current.triggerEvent === entry.trigger_event &&
      Math.abs(new Date(current.timestamp).getTime() - entryTime) < 2000
    ) {
      current.entries.push(entry);
    } else {
      current = {
        timestamp: entry.calculated_at,
        triggerEvent: entry.trigger_event,
        entries: [entry],
      };
      groups.push(current);
    }
  }

  return groups;
}

export default function ScoreHistory({ betId }: ScoreHistoryProps) {
  const { data: history = [], isLoading } = useScoreHistory(betId);
  const { data: initiatives = [] } = useInitiatives(betId);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const initMap = useMemo(
    () => new Map(initiatives.map((i) => [i.id, i.description])),
    [initiatives],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return history;
    if (filter === "metric")
      return history.filter((e) => METRIC_TRIGGERS.has(e.trigger_event));
    return history.filter((e) => INITIATIVE_TRIGGERS.has(e.trigger_event));
  }, [history, filter]);

  const groups = useMemo(() => groupByRecalc(filtered), [filtered]);

  if (isLoading) return null;

  // Empty state
  if (history.length === 0) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          What Moved
        </span>
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          Score movements will appear here as you add and edit initiatives and
          metrics.
        </p>
      </div>
    );
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
        <>
          {/* Filter pills */}
          <div className="flex items-center gap-1.5 mt-2 mb-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-sm border transition-colors",
                  filter === f.key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {groups.map((group, gi) => (
              <RecalcGroupView
                key={`${group.timestamp}-${gi}`}
                group={group}
                initMap={initMap}
              />
            ))}
            {groups.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50">
                No entries match this filter.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RecalcGroupView({
  group,
  initMap,
}: {
  group: RecalcGroup;
  initMap: Map<string, string>;
}) {
  const triggerLabel =
    TRIGGER_LABELS[group.triggerEvent] ?? group.triggerEvent;
  const count = group.entries.length;

  return (
    <div className="text-[11px]">
      {/* Group header */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="tabular-nums whitespace-nowrap">
          {relativeTime(group.timestamp)}
        </span>
        <span className="text-foreground/30">·</span>
        <span>{triggerLabel}</span>
        {count > 1 && (
          <>
            <span className="text-foreground/30">·</span>
            <span>
              {count} initiative{count !== 1 ? "s" : ""} re-ranked
            </span>
          </>
        )}
      </div>

      {/* Individual entries */}
      {count > 1 ? (
        <div className="ml-3 mt-0.5 border-l border-muted pl-2 space-y-0.5">
          {group.entries.map((entry, i) => (
            <EntryLine
              key={entry.id}
              entry={entry}
              initMap={initMap}
              isLast={i === group.entries.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="mt-0.5">
          <EntryLine
            entry={group.entries[0]}
            initMap={initMap}
            isLast
          />
        </div>
      )}
    </div>
  );
}

function EntryLine({
  entry,
  initMap,
  isLast,
}: {
  entry: ScoreHistoryEntry;
  initMap: Map<string, string>;
  isLast: boolean;
}) {
  const scoreDelta = entry.new_score - entry.previous_score;
  const rankImproved = entry.new_rank < entry.previous_rank;
  const rankDeclined = entry.new_rank > entry.previous_rank;
  const desc = initMap.get(entry.initiative_id) ?? "Unknown initiative";
  const truncDesc = desc.length > 40 ? desc.slice(0, 40) + "…" : desc;

  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-muted-foreground/30 shrink-0 leading-tight">
        {isLast ? "└" : "├"}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-foreground/70 truncate">{truncDesc}</span>
        <div className="flex items-center gap-3 mt-px">
          <span
            className={cn(
              "tabular-nums",
              rankImproved
                ? "text-signal-green"
                : rankDeclined
                  ? "text-signal-red"
                  : "text-muted-foreground",
            )}
          >
            Rank {entry.previous_rank} → {entry.new_rank}
          </span>
          <span
            className={cn(
              "tabular-nums",
              scoreDelta > 0
                ? "text-signal-green"
                : scoreDelta < 0
                  ? "text-signal-red"
                  : "text-muted-foreground",
            )}
          >
            {scoreDelta > 0 ? "+" : ""}
            {scoreDelta.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
