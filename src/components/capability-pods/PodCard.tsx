import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { CapabilityPod } from "@/lib/types";
import { computeDriftWarnings } from "@/lib/types";

interface PodCardProps {
  pod: CapabilityPod;
  betId: string;
  canWrite: boolean;
  onToggle: (id: string, field: "prototype_built" | "customer_validated" | "production_shipped", value: boolean) => void;
  onClick: () => void;
}

export default function PodCard({ pod, betId, canWrite, onToggle, onClick }: PodCardProps) {
  const isPrimary = pod.primary_bet_id === betId;
  const warnings = computeDriftWarnings(pod);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="border rounded-md p-3 bg-background hover:bg-accent/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0",
              isPrimary
                ? "bg-foreground text-background"
                : "border border-foreground text-foreground",
            )}
          >
            {isPrimary ? "Primary" : "Secondary"}
          </span>
          <span className="text-sm font-medium truncate">{pod.name}</span>
        </div>
        <StatusBadge status={pod.status} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span>Owner: <span className="font-medium text-foreground">{pod.owner}</span></span>
        {pod.deliverable && (
          <span className="truncate">Deliverable: <span className="font-medium text-foreground">{pod.deliverable}</span></span>
        )}
      </div>

      <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={pod.prototype_built}
            disabled={!canWrite}
            onChange={(e) => onToggle(pod.id, "prototype_built", e.target.checked)}
            className="rounded border-muted-foreground/50 h-3.5 w-3.5"
          />
          Prototype
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={pod.customer_validated}
            disabled={!canWrite}
            onChange={(e) => onToggle(pod.id, "customer_validated", e.target.checked)}
            className="rounded border-muted-foreground/50 h-3.5 w-3.5"
          />
          Validated
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={pod.production_shipped}
            disabled={!canWrite}
            onChange={(e) => onToggle(pod.id, "production_shipped", e.target.checked)}
            className="rounded border-muted-foreground/50 h-3.5 w-3.5"
          />
          Shipped
        </label>
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {warnings.map((w, i) => (
            <span key={i} className="text-[10px] font-semibold uppercase tracking-wider text-signal-amber">
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
