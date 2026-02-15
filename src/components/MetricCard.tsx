import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
  children?: ReactNode;
}

export default function MetricCard({ label, value, sub, alert, children }: MetricCardProps) {
  return (
    <div className={cn(
      "border rounded-md p-4",
      alert ? "border-signal-amber bg-signal-amber/5" : "border-border"
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className={cn(
        "text-2xl font-bold text-mono",
        alert && "text-signal-amber"
      )}>
        {value}
      </p>
      {sub && (
        <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>
      )}
      {children}
    </div>
  );
}
