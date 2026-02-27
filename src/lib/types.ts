export type ImpactTier = "High" | "Medium" | "Low";
export type DecisionStatus = "defined" | "activated" | "proving_value" | "scaling" | "durable" | "closed";
export type DecisionRiskLevel = "healthy" | "watch" | "at_risk";
export type SignalType = "KPI Deviation" | "Segment Variance" | "Agent Drift" | "Exec Escalation" | "Launch Milestone" | "Renewal Risk" | "Cross-Solution Conflict";
export type OutcomeCategory = "ARR" | "NRR" | "DPI_Adoption" | "Agent_Trust" | "Live_Event_Risk" | "Operational_Efficiency";
export type SolutionDomain = "S1" | "S2" | "S3" | "Cross";
export type DecisionHealth = "On Track" | "At Risk" | "Degrading";

export interface Decision {
  id: string;
  title: string;
  triggerSignal: string;
  outcomeTarget: string;
  outcomeCategory?: OutcomeCategory;
  expectedImpact?: string;
  currentDelta?: string;
  revenueAtRisk?: string;
  impactTier: ImpactTier;
  segmentImpact?: string;
  owner: string;
  status: DecisionStatus;
  riskLevel?: DecisionRiskLevel;
  createdDate: string;
  sliceDeadlineDays?: number;
  shippedSliceDate?: string;
  measuredOutcomeResult?: string;
  blockedReason?: string;
  blockedDependencyOwner?: string;
  solutionDomain: SolutionDomain;
  surface: string;
  decisionHealth?: DecisionHealth;
}

export interface Signal {
  id: string;
  type: SignalType;
  description: string;
  source: string;
  createdDate: string;
  decisionId?: string;
  solutionDomain?: SolutionDomain;
}

export interface Pod {
  id: string;
  name: string;
  owner: string;
  solutionDomain: SolutionDomain;
  initiatives: PodInitiative[];
}

export interface PodInitiative {
  id: string;
  name: string;
  lastDemoDate?: string;
  sliceDeadline: string;
  owner: string;
  outcomeLinked: boolean;
  shipped: boolean;
  renewalAligned?: boolean;
  crossSolutionDep?: string;
}

export interface ClosedDecision {
  id: string;
  decisionId: string;
  title: string;
  expectedOutcome: string;
  actualResult: string;
  segmentShift?: string;
  agentImpact?: string;
  notes: string;
  closedDate: string;
  solutionDomain: SolutionDomain;
  renewalImpact?: string;
  predictionAccuracy: "Accurate" | "Partial" | "Missed";
}

export type CapabilityPodStatus = "proposed" | "prototyping" | "validated" | "building" | "in_production" | "paused";

export interface KpiTarget {
  kpi_name: string;
  baseline: string;
  target: string;
  unit: string;
  measurement_notes?: string;
}

export interface PodDependencies {
  shared_primitive: boolean;
  notes: string;
  blocking_pods: string[];
}

export interface CapabilityPod {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  primary_bet_id: string;
  secondary_bet_id: string | null;
  owner: string;
  status: CapabilityPodStatus;
  deliverable: string | null;
  kpi_targets: KpiTarget[];
  prototype_built: boolean;
  customer_validated: boolean;
  production_shipped: boolean;
  cycle_time_days: number | null;
  dependencies: PodDependencies;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CAPABILITY_POD_STATUSES: CapabilityPodStatus[] = [
  "proposed", "prototyping", "validated", "building", "in_production", "paused",
];

export const POD_STATUS_LABELS: Record<CapabilityPodStatus, string> = {
  proposed: "Proposed",
  prototyping: "Prototyping",
  validated: "Validated",
  building: "Building",
  in_production: "In Production",
  paused: "Paused",
};

export function canSetInProduction(pod: { prototype_built: boolean; customer_validated: boolean }): boolean {
  return pod.prototype_built && pod.customer_validated;
}

export function parsePodDependencies(raw: unknown): PodDependencies {
  const d = raw as Record<string, unknown> | null;
  return {
    shared_primitive: d?.shared_primitive === true,
    notes: typeof d?.notes === "string" ? d.notes : "",
    blocking_pods: Array.isArray(d?.blocking_pods) ? (d.blocking_pods as string[]) : [],
  };
}

export function parseKpiTargets(raw: unknown): KpiTarget[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is KpiTarget =>
      typeof item === "object" && item !== null && typeof (item as any).kpi_name === "string",
  );
}

export function computeDriftWarnings(pod: CapabilityPod): string[] {
  const warnings: string[] = [];
  if (pod.kpi_targets.length === 0) {
    warnings.push("No KPI targets set");
  }
  if (pod.status === "in_production" && !pod.production_shipped) {
    warnings.push("In production but not yet shipped");
  }
  if ((pod.status === "building" || pod.status === "in_production") && !pod.customer_validated) {
    warnings.push("Customer validation missing");
  }
  if (
    !pod.secondary_bet_id &&
    pod.description &&
    /cross|platform/i.test(pod.description)
  ) {
    warnings.push("Cross-platform pod without secondary bet");
  }
  return warnings;
}

export function parseCsvImport(
  text: string,
  decisions: { id: string; title: string }[],
): { rows: { pod_name: string; primary_bet: string; secondary_bet: string; owner: string; status: string; deliverable: string; primary_bet_id: string | null; secondary_bet_id: string | null; error?: string }[] } {
  const titleMap = new Map(decisions.map((d) => [d.title.toLowerCase().trim(), d.id]));
  const lines = text.split("\n").filter((l) => l.trim());
  const rows = lines.map((line) => {
    const parts = line.split(/[|\t]/).map((p) => p.trim());
    const [pod_name = "", primary_bet = "", secondary_bet = "", owner = "", status = "", deliverable = ""] = parts;
    const primary_bet_id = titleMap.get(primary_bet.toLowerCase()) ?? null;
    const secondary_bet_id = secondary_bet ? (titleMap.get(secondary_bet.toLowerCase()) ?? null) : null;
    let error: string | undefined;
    if (!pod_name) error = "Missing pod name";
    else if (!primary_bet_id) error = `Bet "${primary_bet}" not found`;
    else if (secondary_bet && !secondary_bet_id) error = `Secondary bet "${secondary_bet}" not found`;
    return { pod_name, primary_bet, secondary_bet, owner, status, deliverable, primary_bet_id, secondary_bet_id, error };
  });
  return { rows };
}

export function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntil(dateStr: string): number {
  return -daysSince(dateStr);
}
