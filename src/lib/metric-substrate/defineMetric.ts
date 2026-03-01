import type { SupabaseClient } from "@supabase/supabase-js";
import type { BetMetric } from "@/lib/types";

/**
 * Creates a new metric attached to a bet's outcome key.
 */
export async function defineMetric(
  params: {
    bet_id: string;
    outcome_key: string;
    metric_name: string;
    target_value: number;
  },
  supabase: SupabaseClient,
): Promise<BetMetric> {
  const { data, error } = await supabase
    .from("bet_metrics")
    .insert({
      bet_id: params.bet_id,
      outcome_key: params.outcome_key,
      metric_name: params.metric_name,
      target_value: params.target_value,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create metric: ${error?.message}`);
  }

  return data as BetMetric;
}
