import type { SupabaseClient } from "@supabase/supabase-js";
import type { BetMetric } from "@/lib/types";
import { calculateMetricStatus } from "./calculateMetricStatus";
import { recalculateBetState } from "@/lib/outcome-engine/recalculateBetState";

/**
 * Updates a metric's current value, recalculates its status,
 * then triggers a full bet recalculation.
 */
export async function updateMetricValue(
  metricId: string,
  newValue: number,
  supabase: SupabaseClient,
): Promise<BetMetric> {
  // 1. Fetch the current metric to get target_value and bet_id
  const { data: existing, error: fetchError } = await supabase
    .from("bet_metrics")
    .select("*")
    .eq("id", metricId)
    .single();

  if (fetchError || !existing) {
    throw new Error(`Metric ${metricId} not found: ${fetchError?.message}`);
  }

  const metric = existing as BetMetric;

  // 2. Calculate new status
  const newStatus = calculateMetricStatus(newValue, metric.target_value);

  // 3. Persist update
  const { data: updated, error: updateError } = await supabase
    .from("bet_metrics")
    .update({
      current_value: newValue,
      status: newStatus,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", metricId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update metric ${metricId}: ${updateError?.message}`);
  }

  // 4. Trigger bet recalculation
  await recalculateBetState(metric.bet_id, "BET_METRIC_UPDATED", supabase);

  return updated as BetMetric;
}
