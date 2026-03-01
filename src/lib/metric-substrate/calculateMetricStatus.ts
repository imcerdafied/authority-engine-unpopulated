import type { BetMetric } from "@/lib/types";

/**
 * Determines metric health based on current progress toward target.
 *
 *  >= 80% of target → OnTrack
 *  >= 50% of target → AtRisk
 *  < 50% of target  → OffTrack
 */
export function calculateMetricStatus(
  currentValue: number,
  targetValue: number,
): BetMetric["status"] {
  if (targetValue <= 0) return "OnTrack";
  if (currentValue >= targetValue * 0.8) return "OnTrack";
  if (currentValue >= targetValue * 0.5) return "AtRisk";
  return "OffTrack";
}
