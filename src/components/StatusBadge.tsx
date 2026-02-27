import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  defined: "bg-muted text-muted-foreground",
  activated: "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  proving_value: "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  scaling: "bg-foreground text-primary-foreground",
  durable: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  closed: "bg-accent text-accent-foreground",
  healthy: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  watch: "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  at_risk: "bg-signal-red/10 text-signal-red border border-signal-red/30",
  active: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  accepted: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  rejected: "bg-signal-red/10 text-signal-red border border-signal-red/30",
  archived: "bg-muted text-muted-foreground",
  Active: "bg-foreground text-primary-foreground",
  Blocked: "bg-signal-red text-signal-red-foreground",
  Draft: "bg-muted text-muted-foreground",
  Closed: "bg-accent text-accent-foreground",
  High: "bg-foreground text-primary-foreground",
  Medium: "bg-muted text-foreground",
  Low: "bg-muted text-muted-foreground",
  "S1": "bg-foreground/80 text-primary-foreground",
  "S2": "bg-foreground/60 text-primary-foreground",
  "S3": "bg-foreground/40 text-primary-foreground",
  "Cross-Solution": "border border-foreground text-foreground bg-transparent",
  proposed: "bg-muted text-muted-foreground",
  prototyping: "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  validated: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  building: "bg-foreground/80 text-primary-foreground",
  in_production: "bg-signal-green text-white",
  paused: "bg-muted text-muted-foreground/70",
  "On Track": "bg-signal-green/10 text-signal-green border border-signal-green/30",
  "At Risk": "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  "Degrading": "bg-signal-red/10 text-signal-red border border-signal-red/30",
  "Accurate": "bg-signal-green/10 text-signal-green",
  "Partial": "bg-signal-amber/10 text-signal-amber",
  "Missed": "bg-signal-red/10 text-signal-red",
};

const labelOverrides: Record<string, string> = {
  "S1": "Video",
  "S2": "DPI",
  "S3": "Agent Intelligence",
  active: "Active",
  defined: "Defined",
  activated: "Activated",
  proving_value: "Proving Value",
  scaling: "Scaling",
  durable: "Durable",
  closed: "Closed",
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
  accepted: "Accepted",
  rejected: "Rejected",
  archived: "Archived",
  proposed: "Proposed",
  prototyping: "Prototyping",
  validated: "Validated",
  building: "Building",
  in_production: "In Production",
  paused: "Paused",
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm",
        statusStyles[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {labelOverrides[status] || status}
    </span>
  );
}
