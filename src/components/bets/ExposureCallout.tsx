import { cn } from "@/lib/utils";

interface ExposureCalloutProps {
  label: string;
  variant: "upside" | "risk";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  upside: {
    wrapper: "border-emerald-200/50 bg-emerald-50/20",
    label: "text-emerald-700/70",
    content: "text-emerald-800/90",
  },
  risk: {
    wrapper: "border-signal-red/20 bg-signal-red/[0.03]",
    label: "text-signal-red/70",
    content: "text-signal-red/90",
  },
};

export default function ExposureCallout({ label, variant, children, className }: ExposureCalloutProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn("border rounded-md p-3", styles.wrapper, className)}>
      <span className={cn("text-[11px] uppercase tracking-[0.16em] block mb-1", styles.label)}>
        {label}
      </span>
      <div className={cn("text-sm", styles.content)}>{children}</div>
    </div>
  );
}
