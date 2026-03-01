import type { BetMetric, BetInitiative, DriftFlag } from "@/lib/types";

/**
 * Detects three types of drift for a bet:
 *
 * 1. Alignment drift — >60% of top-3 initiatives align to the same outcome
 *    (over-concentration risk)
 * 2. Metric gap — an OffTrack metric has no aligned initiative in the top 3
 * 3. Score volatility — any initiative with |last_score_delta| > 20% of its
 *    previous score
 */
export function detectOutcomeDrift(
  declaredOutcomes: string[],
  metrics: BetMetric[],
  initiatives: BetInitiative[],
): DriftFlag[] {
  const flags: DriftFlag[] = [];
  const now = new Date().toISOString();

  const top3 = [...initiatives]
    .sort((a, b) => a.roadmap_position - b.roadmap_position)
    .slice(0, 3);

  // 1. Alignment drift: check if >60% of top-3 share a single outcome
  if (top3.length > 0) {
    const outcomeCounts = new Map<string, number>();
    for (const init of top3) {
      for (const outcome of init.aligned_outcomes) {
        outcomeCounts.set(outcome, (outcomeCounts.get(outcome) ?? 0) + 1);
      }
    }
    for (const [outcome, count] of outcomeCounts) {
      if (count / top3.length > 0.6) {
        flags.push({
          type: "alignment_drift",
          severity: "medium",
          description: `Over-concentration: ${count}/${top3.length} top initiatives align to "${outcome}"`,
          detected_at: now,
        });
      }
    }
  }

  // 2. Metric gap: OffTrack metrics with no top-3 initiative covering them
  const top3Outcomes = new Set(top3.flatMap((i) => i.aligned_outcomes));
  for (const metric of metrics) {
    if (metric.status === "OffTrack" && !top3Outcomes.has(metric.outcome_key)) {
      flags.push({
        type: "metric_gap",
        severity: "high",
        description: `OffTrack metric "${metric.metric_name}" (${metric.outcome_key}) has no aligned initiative in top 3`,
        detected_at: now,
      });
    }
  }

  // 3. Score volatility: |last_score_delta| > 20% of previous score
  for (const init of initiatives) {
    const previousScore = init.score_v3 - init.last_score_delta;
    if (previousScore !== 0 && Math.abs(init.last_score_delta) > Math.abs(previousScore) * 0.2) {
      flags.push({
        type: "score_volatility",
        severity: "low",
        description: `Initiative "${init.description}" score shifted by ${init.last_score_delta.toFixed(2)} (>${(Math.abs(previousScore) * 0.2).toFixed(2)} threshold)`,
        detected_at: now,
      });
    }
  }

  return flags;
}
