import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
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
  "On Track": "bg-signal-green/10 text-signal-green border border-signal-green/30",
  "At Risk": "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  "Degrading": "bg-signal-red/10 text-signal-red border border-signal-red/30",
  "Accurate": "bg-signal-green/10 text-signal-green",
  "Partial": "bg-signal-amber/10 text-signal-amber",
  "Missed": "bg-signal-red/10 text-signal-red",
};

const labelOverrides: Record<string, string> = {
  "S1": "S1 · Video",
  "S2": "S2 · DPI",
  "S3": "S3 · Agent",
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
