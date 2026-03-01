import type { SupabaseClient } from "@supabase/supabase-js";
import type { BetInitiative } from "@/lib/types";

/**
 * Fire-and-forget insert into score_history to record a rank/score change.
 */
export async function logScoreMovement(
  before: { score_v3: number; roadmap_position: number },
  after: BetInitiative,
  triggerEvent: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.from("score_history").insert({
    initiative_id: after.id,
    bet_id: after.bet_id,
    previous_score: before.score_v3,
    new_score: after.score_v3,
    previous_rank: before.roadmap_position,
    new_rank: after.roadmap_position,
    trigger_event: triggerEvent,
  });
}
