import { useState } from "react";
import { useDrift } from "@/hooks/useDrift";
import { cn } from "@/lib/utils";
import type { DriftFlag } from "@/lib/types";

interface DriftIndicatorsProps {
  betId: string;
}

const DRIFT_CONFIG: Record<
  DriftFlag["type"],
  { label: string; color: string; bg: string; border: string }
> = {
  alignment_drift: {
    label: "Alignment Drift",
    color: "text-signal-amber",
    bg: "bg-signal-amber/8",
    border: "border-signal-amber/20",
  },
  metric_gap: {
    label: "Metric Gap",
    color: "text-signal-red",
    bg: "bg-signal-red/8",
    border: "border-signal-red/20",
  },
  score_volatility: {
    label: "Score Volatility",
    color: "text-signal-amber",
    bg: "bg-signal-amber/8",
    border: "border-signal-amber/20",
  },
};

export default function DriftIndicators({ betId }: DriftIndicatorsProps) {
  const { driftFlags, isLoading } = useDrift(betId);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isLoading) return null;

  const visible = driftFlags.filter(
    (f) => !dismissed.has(`${f.type}-${f.detected_at}`),
  );

  if (visible.length === 0) return null;

  return (
    <div className="px-4 md:px-6 py-3 border-t space-y-1.5">
      {visible.map((flag) => {
        const config = DRIFT_CONFIG[flag.type];
        const key = `${flag.type}-${flag.detected_at}`;
        return (
          <div
            key={key}
            className={cn(
              "flex items-start gap-2 px-3 py-2 rounded-sm border text-xs",
              config.bg,
              config.border,
            )}
          >
            <span className={cn("shrink-0 mt-px", config.color)}>
              {flag.type === "metric_gap" ? "!" : "~"}
            </span>
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  config.color,
                )}
              >
                {config.label}
              </span>
              <p className="text-foreground/70 mt-0.5 leading-snug">
                {flag.description}
              </p>
            </div>
            <button
              onClick={() =>
                setDismissed((prev) => new Set([...prev, key]))
              }
              className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors text-[10px] mt-0.5"
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact drift badge for bet cards in list view.
 * Shows small colored dots indicating active drift types.
 */
export function DriftBadge({ betId }: { betId: string }) {
  const { driftFlags, isLoading } = useDrift(betId);

  if (isLoading || driftFlags.length === 0) return null;

  const hasMetricGap = driftFlags.some((f) => f.type === "metric_gap");
  const hasAmber = driftFlags.some(
    (f) => f.type === "alignment_drift" || f.type === "score_volatility",
  );

  const summaryLines = driftFlags.map((f) => {
    const label = DRIFT_CONFIG[f.type].label;
    return `${label}: ${f.description}`;
  });
  const tooltip = summaryLines.join("\n");

  return (
    <span className="inline-flex items-center gap-1" title={tooltip}>
      {hasMetricGap && (
        <span className="inline-block w-2 h-2 rounded-full bg-signal-red" />
      )}
      {hasAmber && (
        <span className="inline-block w-2 h-2 rounded-full bg-signal-amber" />
      )}
    </span>
  );
}
