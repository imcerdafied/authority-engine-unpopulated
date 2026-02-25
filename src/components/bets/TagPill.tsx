import { cn } from "@/lib/utils";

interface TagPillProps {
  children: React.ReactNode;
  variant?: "default" | "domain" | "warning" | "danger";
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  domain: "bg-foreground/10 text-foreground border border-foreground/20",
  warning: "text-signal-amber",
  danger: "text-signal-red",
};

export default function TagPill({ children, variant = "default", className }: TagPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
