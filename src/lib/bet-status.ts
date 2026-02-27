export const BET_LIFECYCLE_STATUSES = [
  "defined",
  "activated",
  "proving_value",
  "scaling",
  "durable",
  "closed",
] as const;

export type BetLifecycleStatus = (typeof BET_LIFECYCLE_STATUSES)[number];

export const BET_RISK_LEVELS = ["healthy", "watch", "at_risk"] as const;

export type BetRiskLevel = (typeof BET_RISK_LEVELS)[number];

export const BET_LIFECYCLE_LABELS: Record<BetLifecycleStatus, string> = {
  defined: "Defined",
  activated: "Activated",
  proving_value: "Proving Value",
  scaling: "Scaling",
  durable: "Durable",
  closed: "Closed",
};

export const BET_RISK_LABELS: Record<BetRiskLevel, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
};

export function isBetLifecycleStatus(value: string): value is BetLifecycleStatus {
  return (BET_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export function isBetRiskLevel(value: string): value is BetRiskLevel {
  return (BET_RISK_LEVELS as readonly string[]).includes(value);
}

export function formatBetLifecycleStatus(value: string | null | undefined): string {
  if (!value) return BET_LIFECYCLE_LABELS.defined;
  if (isBetLifecycleStatus(value)) return BET_LIFECYCLE_LABELS[value];
  return BET_LIFECYCLE_LABELS.defined;
}

export function formatBetRiskLevel(value: string | null | undefined): string {
  if (!value) return BET_RISK_LABELS.healthy;
  if (isBetRiskLevel(value)) return BET_RISK_LABELS[value];
  return BET_RISK_LABELS.healthy;
}

export function toBetLifecycleStatus(value: string | null | undefined): BetLifecycleStatus {
  if (!value) return "defined";
  if (isBetLifecycleStatus(value)) return value;
  return "defined";
}

export function toBetRiskLevel(value: string | null | undefined): BetRiskLevel {
  if (!value) return "healthy";
  if (isBetRiskLevel(value)) return value;
  return "healthy";
}

export function isClosedBetLifecycle(value: string | null | undefined): boolean {
  return toBetLifecycleStatus(value) === "closed";
}

export function mapLegacyBetStatus(rawStatus: string | null | undefined): {
  status: BetLifecycleStatus;
  riskLevel: BetRiskLevel;
} {
  const status = String(rawStatus ?? "").trim().toLowerCase();
  switch (status) {
    case "hypothesis defined":
    case "hypothesis":
    case "draft":
    case "defined":
      return { status: "defined", riskLevel: "healthy" };
    case "active":
    case "activated":
      return { status: "activated", riskLevel: "healthy" };
    case "piloting":
    case "proving value":
    case "proving_value":
      return { status: "proving_value", riskLevel: "healthy" };
    case "scaling":
      return { status: "scaling", riskLevel: "healthy" };
    case "durable":
    case "accepted":
      return { status: "durable", riskLevel: "healthy" };
    case "closed":
    case "archived":
    case "rejected":
      return { status: "closed", riskLevel: "healthy" };
    case "at risk":
    case "at_risk":
    case "blocked":
      return { status: "proving_value", riskLevel: "at_risk" };
    default:
      return { status: "defined", riskLevel: "watch" };
  }
}
