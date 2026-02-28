import {
  BET_LIFECYCLE_LABELS,
  BET_LIFECYCLE_STATUSES,
  type BetLifecycleStatus,
} from "@/lib/bet-status";
import { cn } from "@/lib/utils";

interface LifecycleRiskControlsProps {
  lifecycle: BetLifecycleStatus;
  canEdit: boolean;
  onLifecycleChange: (next: BetLifecycleStatus) => void;
}

export default function LifecycleRiskControls({
  lifecycle,
  canEdit,
  onLifecycleChange,
}: LifecycleRiskControlsProps) {
  return (
    <select
      value={lifecycle}
      aria-label="Lifecycle"
      disabled={!canEdit}
      onChange={(e) => onLifecycleChange(e.target.value as BetLifecycleStatus)}
      className={cn(
        "text-sm border border-white/40 rounded-sm px-2 py-1.5 bg-white text-black w-full",
        !canEdit && "opacity-60 cursor-not-allowed",
      )}
    >
      {BET_LIFECYCLE_STATUSES.map((status) => (
        <option key={status} value={status}>
          {BET_LIFECYCLE_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
