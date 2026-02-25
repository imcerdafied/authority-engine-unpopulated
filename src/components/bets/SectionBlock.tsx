import { useState } from "react";
import { cn } from "@/lib/utils";

interface SectionBlockProps {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export default function SectionBlock({
  label,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: SectionBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-1", className)}>
      {collapsible ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-[10px]">{open ? "\u25BC" : "\u25B6"}</span>
          {label}
        </button>
      ) : (
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block">
          {label}
        </span>
      )}
      {open && <div>{children}</div>}
    </div>
  );
}
