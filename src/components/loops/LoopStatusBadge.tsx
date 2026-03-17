import { cn } from "@/lib/utils";
import type { LoopStatus, LoopDecision } from "@/hooks/useOutcomeLoops";

const statusStyles: Record<LoopStatus, string> = {
  proposed: "bg-muted text-muted-foreground",
  active: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  iterating: "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  completed: "bg-foreground text-primary-foreground",
  killed: "bg-signal-red/10 text-signal-red border border-signal-red/30",
};

const statusLabels: Record<LoopStatus, string> = {
  proposed: "Proposed",
  active: "Active",
  iterating: "Iterating",
  completed: "Completed",
  killed: "Killed",
};

const decisionStyles: Record<LoopDecision, string> = {
  scale: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  iterate: "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  kill: "bg-signal-red/10 text-signal-red border border-signal-red/30",
  unclear: "bg-muted text-muted-foreground",
};

const decisionLabels: Record<LoopDecision, string> = {
  scale: "Scale",
  iterate: "Iterate",
  kill: "Kill",
  unclear: "Unclear",
};

export function LoopStatusBadge({ status, className }: { status: LoopStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm",
        statusStyles[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}

export function LoopDecisionBadge({ decision, className }: { decision: LoopDecision; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm",
        decisionStyles[decision] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {decisionLabels[decision] || decision}
    </span>
  );
}
