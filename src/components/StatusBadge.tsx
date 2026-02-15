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
      {status}
    </span>
  );
}
