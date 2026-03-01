/**
 * V3 scoring formula:
 *   score = (value × confidence × outcomeMultiplier) / effort
 *
 * Returns 0 when effort <= 0 to avoid division by zero.
 */
export function calculateV3Score(params: {
  value: number;
  confidence: number;
  effort: number;
  outcomeMultiplier: number;
}): number {
  const { value, confidence, effort, outcomeMultiplier } = params;
  if (effort <= 0) return 0;
  return (value * confidence * outcomeMultiplier) / effort;
}
