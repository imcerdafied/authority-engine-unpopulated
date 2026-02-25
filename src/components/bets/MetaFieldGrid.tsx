import { cn } from "@/lib/utils";

interface MetaFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function MetaField({ label, children, className }: MetaFieldProps) {
  return (
    <div className={className}>
      <span className="text-[11px] uppercase tracking-[0.16em] text-white/80 block mb-0.5">
        {label}
      </span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

interface MetaFieldGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export default function MetaFieldGrid({ children, columns = 3, className }: MetaFieldGridProps) {
  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className={cn("grid gap-3", colClass, className)}>
      {children}
    </div>
  );
}
