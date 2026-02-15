export type ImpactTier = "High" | "Medium" | "Low";
export type DecisionStatus = "Draft" | "Active" | "Blocked" | "Closed";
export type SignalType = "KPI Deviation" | "Segment Variance" | "Agent Drift" | "Exec Escalation" | "Launch Milestone" | "Renewal Risk" | "Cross-Solution Conflict";
export type OutcomeCategory = "Revenue" | "Retention" | "Conversion" | "Trust" | "Agent Performance" | "Efficiency" | "Enterprise Renewal" | "Platform Adoption" | "Agent Trust" | "QoE Risk" | "Executive Credibility";
export type SolutionType = "S1" | "S2" | "S3" | "Cross-Solution";
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
  createdDate: string;
  sliceDeadlineDays?: number;
  shippedSliceDate?: string;
  measuredOutcomeResult?: string;
  blockedReason?: string;
  blockedDependencyOwner?: string;
  solutionType: SolutionType;
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
  solutionType?: SolutionType;
}

export interface Pod {
  id: string;
  name: string;
  owner: string;
  solutionType: SolutionType;
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
  solutionType: SolutionType;
  renewalImpact?: string;
  predictionAccuracy: "Accurate" | "Partial" | "Missed";
}

export function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntil(dateStr: string): number {
  return -daysSince(dateStr);
}
