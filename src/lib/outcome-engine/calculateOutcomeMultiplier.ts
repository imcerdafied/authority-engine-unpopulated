/**
 * Calculates the outcome multiplier for an initiative based on how many
 * of the bet's declared outcomes it aligns with.
 *
 * multiplier = 1.0 + (intersectionCount × 0.15)
 * Minimum 1.0 — boost only, no penalty.
 */
export function calculateOutcomeMultiplier(
  declaredOutcomes: string[],
  alignedOutcomes: string[],
): number {
  const declared = new Set(declaredOutcomes);
  const intersectionCount = alignedOutcomes.filter((o) => declared.has(o)).length;
  return 1.0 + intersectionCount * 0.15;
}
