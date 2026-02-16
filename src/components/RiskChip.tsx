import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const RISK_SUBTEXT: Record<string, string> = {
  Green: "No elevated risk signals",
  Yellow: "Owner review recommended this week",
  Red: "Immediate executive attention required",
};

const dotColors: Record<string, string> = {
  Green: "bg-signal-green",
  Yellow: "bg-signal-amber",
  Red: "bg-signal-red",
};

const chipStyles: Record<string, string> = {
  Green: "text-signal-green border-signal-green/30",
  Yellow: "text-signal-amber border-signal-amber/30",
  Red: "text-signal-red border-signal-red/30",
};

interface RiskChipProps {
  indicator: "Green" | "Yellow" | "Red";
  className?: string;
}

export default function RiskChip({ indicator, className }: RiskChipProps) {
  const subtext = RISK_SUBTEXT[indicator] ?? "";
  const dotColor = dotColors[indicator] ?? "bg-muted";
  const chipStyle = chipStyles[indicator] ?? "text-muted-foreground border-muted";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider rounded-sm border",
            chipStyle,
            className
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
          {indicator}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs font-normal max-w-[220px]">
        {subtext}
      </TooltipContent>
    </Tooltip>
  );
}
