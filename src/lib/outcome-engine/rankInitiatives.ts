import type { BetInitiative } from "@/lib/types";

/**
 * Sorts initiatives by score_v3 descending and assigns 1-indexed
 * roadmap_position values.
 */
export function rankInitiatives(initiatives: BetInitiative[]): BetInitiative[] {
  const sorted = [...initiatives].sort((a, b) => b.score_v3 - a.score_v3);
  return sorted.map((init, idx) => ({
    ...init,
    roadmap_position: idx + 1,
  }));
}
