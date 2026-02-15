export type ImpactTier = "High" | "Medium" | "Low";
export type DecisionStatus = "Draft" | "Active" | "Blocked" | "Closed";
export type SignalType = "KPI Deviation" | "Segment Variance" | "Agent Drift" | "Exec Escalation" | "Launch Milestone";
export type OutcomeCategory = "Revenue" | "Retention" | "Conversion" | "Trust" | "Agent Performance" | "Efficiency";

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
}

export interface Signal {
  id: string;
  type: SignalType;
  description: string;
  source: string;
  createdDate: string;
  decisionId?: string;
}

export interface Pod {
  id: string;
  name: string;
  owner: string;
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
}

export function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntil(dateStr: string): number {
  return -daysSince(dateStr);
}
