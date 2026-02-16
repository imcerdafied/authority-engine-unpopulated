import { cn } from "@/lib/utils";

const RISK_SUBTEXT: Record<string, string> = {
  Green: "No elevated risk signals",
  Yellow: "Owner review recommended this week",
  Red: "Immediate executive attention required",
};

const riskStyles: Record<string, string> = {
  Green: "bg-signal-green/10 text-signal-green border border-signal-green/30",
  Yellow: "bg-signal-amber/10 text-signal-amber border border-signal-amber/30",
  Red: "bg-signal-red/10 text-signal-red border border-signal-red/30",
};

interface RiskBadgeProps {
  indicator: "Green" | "Yellow" | "Red";
  showSubtext?: boolean;
  className?: string;
}

export default function RiskBadge({ indicator, showSubtext = true, className }: RiskBadgeProps) {
  const subtext = RISK_SUBTEXT[indicator] ?? "";
  return (
    <div className={cn("inline-flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm w-fit",
          riskStyles[indicator] || "bg-muted text-muted-foreground"
        )}
      >
        {indicator}
      </span>
      {showSubtext && subtext && (
        <span className="text-[10px] text-muted-foreground leading-tight">{subtext}</span>
      )}
    </div>
  );
}
