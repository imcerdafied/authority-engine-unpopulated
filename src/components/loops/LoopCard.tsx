import { cn } from "@/lib/utils";
import { LoopStatusBadge, LoopDecisionBadge } from "./LoopStatusBadge";
import type { OutcomeLoopComputed } from "@/hooks/useOutcomeLoops";
import { useOrgMembers } from "@/hooks/useTeam";

interface LoopCardProps {
  loop: OutcomeLoopComputed;
  onClick: () => void;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function LoopCard({ loop, onClick }: LoopCardProps) {
  const { data: members = [] } = useOrgMembers();
  const owner = members.find((m) => m.user_id === loop.owner_user_id);
  const ownerName = owner?.display_name || owner?.email || "TBD";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left border rounded-sm px-3 py-2.5 bg-background hover:border-foreground/30 transition-all group",
        loop.is_stale && "border-signal-amber/40",
        loop.has_no_decision && loop.status !== "proposed" && "border-signal-red/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug truncate group-hover:text-foreground">
            {loop.title}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {ownerName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <LoopStatusBadge status={loop.status} className="!text-[9px] !px-1.5 !py-0" />
          <LoopDecisionBadge decision={loop.current_decision} className="!text-[9px] !px-1.5 !py-0" />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        {loop.last_ship_summary && (
          <span className="truncate max-w-[140px]" title={loop.last_ship_summary}>
            Ship: {loop.last_ship_summary}
          </span>
        )}
        {loop.last_learning && (
          <span className="truncate max-w-[140px]" title={loop.last_learning}>
            Learn: {loop.last_learning}
          </span>
        )}
        {!loop.last_ship_summary && !loop.last_learning && (
          <span className="italic">No updates yet</span>
        )}
      </div>

      {(loop.is_stale || loop.has_no_decision) && (
        <div className="mt-1.5 flex items-center gap-2">
          {loop.is_stale && (
            <span className="text-[9px] uppercase tracking-wider text-signal-amber font-semibold">
              Stale ({loop.days_since_update}d)
            </span>
          )}
          {loop.has_no_decision && (
            <span className="text-[9px] uppercase tracking-wider text-signal-red font-semibold">
              Needs Decision
            </span>
          )}
        </div>
      )}
    </button>
  );
}
