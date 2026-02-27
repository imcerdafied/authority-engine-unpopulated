import {
  BET_LIFECYCLE_LABELS,
  BET_LIFECYCLE_STATUSES,
  BET_RISK_LABELS,
  BET_RISK_LEVELS,
  type BetLifecycleStatus,
  type BetRiskLevel,
} from "@/lib/bet-status";
import { cn } from "@/lib/utils";

interface LifecycleRiskControlsProps {
  lifecycle: BetLifecycleStatus;
  riskLevel: BetRiskLevel;
  canEdit: boolean;
  onLifecycleChange: (next: BetLifecycleStatus) => void;
  onRiskLevelChange: (next: BetRiskLevel) => void;
}

function lifecyclePillClass(status: BetLifecycleStatus): string {
  if (status === "closed") return "bg-muted text-muted-foreground border-muted";
  if (status === "durable") return "bg-signal-green/10 text-signal-green border-signal-green/30";
  if (status === "scaling") return "bg-foreground/90 text-primary-foreground border-foreground/40";
  return "bg-background text-foreground border-border";
}

function riskBadgeClass(riskLevel: BetRiskLevel): string {
  if (riskLevel === "at_risk") return "bg-signal-red/10 text-signal-red border-signal-red/30";
  if (riskLevel === "watch") return "bg-signal-amber/10 text-signal-amber border-signal-amber/30";
  return "bg-signal-green/10 text-signal-green border-signal-green/30";
}

export default function LifecycleRiskControls({
  lifecycle,
  riskLevel,
  canEdit,
  onLifecycleChange,
  onRiskLevelChange,
}: LifecycleRiskControlsProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm border",
            lifecyclePillClass(lifecycle),
          )}
        >
          {BET_LIFECYCLE_LABELS[lifecycle]}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm border",
            riskBadgeClass(riskLevel),
          )}
        >
          {BET_RISK_LABELS[riskLevel]}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={lifecycle}
          aria-label="Lifecycle"
          disabled={!canEdit}
          onChange={(e) => onLifecycleChange(e.target.value as BetLifecycleStatus)}
          className={cn(
            "text-sm border border-white/40 rounded-sm px-2 py-1.5 bg-white text-black flex-1",
            !canEdit && "opacity-60 cursor-not-allowed",
          )}
        >
          {BET_LIFECYCLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {BET_LIFECYCLE_LABELS[status]}
            </option>
          ))}
        </select>

        <select
          value={riskLevel}
          aria-label="Risk"
          disabled={!canEdit}
          onChange={(e) => onRiskLevelChange(e.target.value as BetRiskLevel)}
          className={cn(
            "text-xs border border-white/40 rounded-sm px-2 py-1.5 bg-white/90 text-black min-w-[100px]",
            !canEdit && "opacity-60 cursor-not-allowed",
          )}
        >
          {BET_RISK_LEVELS.map((risk) => (
            <option key={risk} value={risk}>
              {BET_RISK_LABELS[risk]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
