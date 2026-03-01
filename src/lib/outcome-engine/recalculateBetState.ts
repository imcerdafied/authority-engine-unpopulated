import type { SupabaseClient } from "@supabase/supabase-js";
import type { BetInitiative, BetMetric, DriftFlag } from "@/lib/types";
import { calculateOutcomeMultiplier } from "./calculateOutcomeMultiplier";
import { calculateV3Score } from "./calculateV3Score";
import { rankInitiatives } from "./rankInitiatives";
import { detectOutcomeDrift } from "./detectOutcomeDrift";
import { logScoreMovement } from "./logScoreMovement";

/**
 * Orchestrator: recalculates all initiative scores, ranks, drift flags,
 * and persists the results for a given bet.
 *
 * Steps:
 *  1. Load the bet's declared outcomes (unique outcome_keys from its metrics)
 *  2. Load all bet_initiatives for this bet
 *  3. Load all bet_metrics for this bet
 *  4. For each initiative: calculate multiplier, V3 score, compute delta
 *  5. Rank all initiatives
 *  6. Log score movements for any initiative whose rank changed
 *  7. Run drift detection
 *  8. Persist updated initiatives (bulk upsert)
 *  9. Persist drift flags to bet_monitoring (upsert)
 */
export async function recalculateBetState(
  betId: string,
  triggerEvent: string,
  supabase: SupabaseClient,
): Promise<{ initiatives: BetInitiative[]; driftFlags: DriftFlag[] }> {
  // 1–3. Load data in parallel
  const [metricsResult, initiativesResult] = await Promise.all([
    supabase.from("bet_metrics").select("*").eq("bet_id", betId),
    supabase.from("bet_initiatives").select("*").eq("bet_id", betId),
  ]);

  const metrics: BetMetric[] = (metricsResult.data ?? []) as BetMetric[];
  const rawInitiatives: BetInitiative[] = (initiativesResult.data ?? []) as BetInitiative[];

  // Derive declared outcomes from the bet's metric outcome_keys
  const declaredOutcomes = [...new Set(metrics.map((m) => m.outcome_key))];

  // 4. Score each initiative
  const scored = rawInitiatives.map((init) => {
    const multiplier = calculateOutcomeMultiplier(declaredOutcomes, init.aligned_outcomes);
    const newScore = calculateV3Score({
      value: init.value,
      confidence: init.confidence,
      effort: init.effort,
      outcomeMultiplier: multiplier,
    });
    const delta = newScore - init.score_v3;
    return {
      ...init,
      outcome_multiplier: multiplier,
      score_v3: newScore,
      last_score_delta: delta,
    };
  });

  // 5. Rank
  const ranked = rankInitiatives(scored);

  // 6. Log score movements for rank or score changes
  const logPromises: Promise<void>[] = [];
  for (const updated of ranked) {
    const original = rawInitiatives.find((i) => i.id === updated.id);
    if (
      original &&
      (original.roadmap_position !== updated.roadmap_position ||
        Math.abs(original.score_v3 - updated.score_v3) > 0.001)
    ) {
      logPromises.push(
        logScoreMovement(
          { score_v3: original.score_v3, roadmap_position: original.roadmap_position },
          updated,
          triggerEvent,
          supabase,
        ),
      );
    }
  }

  // 7. Drift detection
  const driftFlags = detectOutcomeDrift(declaredOutcomes, metrics, ranked);

  // 8. Persist updated initiatives (bulk upsert)
  const upsertPromises = ranked.map((init) =>
    supabase
      .from("bet_initiatives")
      .update({
        outcome_multiplier: init.outcome_multiplier,
        score_v3: init.score_v3,
        roadmap_position: init.roadmap_position,
        last_score_delta: init.last_score_delta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", init.id),
  );

  // 9. Persist drift flags to bet_monitoring (upsert)
  const monitoringUpsert = supabase
    .from("bet_monitoring")
    .upsert(
      {
        bet_id: betId,
        drift_flags: driftFlags,
        last_recalculated_at: new Date().toISOString(),
      },
      { onConflict: "bet_id" },
    );

  // Fire all writes in parallel
  await Promise.all([...logPromises, ...upsertPromises, monitoringUpsert]);

  return { initiatives: ranked, driftFlags };
}
