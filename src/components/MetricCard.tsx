import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
  danger?: boolean;
  children?: ReactNode;
}

export default function MetricCard({ label, value, sub, alert, danger, children }: MetricCardProps) {
  return (
    <div className={cn(
      "border rounded-md p-4",
      danger ? "border-signal-red/40 bg-signal-red/5" :
      alert ? "border-signal-amber/40 bg-signal-amber/5" : "border-border"
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className={cn(
        "text-2xl font-bold text-mono",
        danger ? "text-signal-red" :
        alert && "text-signal-amber"
      )}>
        {value}
      </p>
      {sub && (
        <p className={cn(
          "text-[12px] mt-0.5",
          danger ? "text-signal-red/80" :
          alert ? "text-signal-amber/80" : "text-muted-foreground"
        )}>{sub}</p>
      )}
      {children}
    </div>
  );
}
