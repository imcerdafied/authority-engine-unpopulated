import { useState, useRef, useEffect } from "react";
import { useMetrics, useAddMetric, useUpdateMetricValue } from "@/hooks/useMetrics";
import { useInitiatives } from "@/hooks/useInitiatives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BetMetric } from "@/lib/types";

interface MetricsSidebarProps {
  betId: string;
  canWrite: boolean;
}

const STATUS_COLORS: Record<BetMetric["status"], string> = {
  OnTrack: "bg-signal-green/20 text-signal-green border-signal-green/30",
  AtRisk: "bg-signal-amber/20 text-signal-amber border-signal-amber/30",
  OffTrack: "bg-signal-red/20 text-signal-red border-signal-red/30",
};

const BAR_COLORS: Record<BetMetric["status"], string> = {
  OnTrack: "bg-signal-green",
  AtRisk: "bg-signal-amber",
  OffTrack: "bg-signal-red",
};

/** Format large numbers compactly: 1200000 → 1.2M, 45000 → 45K */
function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2).replace(/\.?0+$/, "")}K`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

// ── Skeleton ──

function MetricSkeleton() {
  return (
    <div className="border rounded-sm px-3 py-2 bg-background animate-pulse space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-muted rounded-sm w-24" />
        <div className="h-4 w-14 bg-muted rounded-sm" />
      </div>
      <div className="h-1.5 bg-muted rounded-full w-full" />
      <div className="h-2.5 bg-muted rounded-sm w-16" />
    </div>
  );
}

export default function MetricsSidebar({ betId, canWrite }: MetricsSidebarProps) {
  const { data: metrics = [], isLoading } = useMetrics(betId);
  const { data: initiatives = [] } = useInitiatives(betId);
  const addMetric = useAddMetric(betId);
  const updateValue = useUpdateMetricValue(betId);
  const [showAdd, setShowAdd] = useState(false);

  // Build a map of outcome_key -> count of initiatives aligned to it
  const alignmentCounts = new Map<string, { aligned: number; total: number }>();
  for (const m of metrics) {
    const aligned = initiatives.filter((i) =>
      i.aligned_outcomes.includes(m.outcome_key),
    ).length;
    alignmentCounts.set(m.outcome_key, {
      aligned,
      total: initiatives.length,
    });
  }

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Outcome Metrics</span>
        <div className="mt-2 space-y-2.5">
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </div>
    );
  }

  if (metrics.length === 0 && !showAdd) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Outcome Metrics</span>
          {canWrite && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add Metric
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-4 border-t">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Outcome Metrics ({metrics.length})
        </span>
        {canWrite && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add Metric
          </button>
        )}
      </div>

      {showAdd && (
        <AddMetricForm
          onSubmit={async (data) => {
            try {
              await addMetric.mutateAsync(data);
              setShowAdd(false);
              toast.success("Metric defined");
            } catch {
              toast.error("Failed to add metric — try again");
            }
          }}
          onCancel={() => setShowAdd(false)}
          submitting={addMetric.isPending}
        />
      )}

      <div className="space-y-2.5">
        {metrics.map((m) => (
          <MetricRow
            key={m.id}
            metric={m}
            canWrite={canWrite}
            alignment={alignmentCounts.get(m.outcome_key)}
            onUpdateValue={async (newValue) => {
              try {
                await updateValue.mutateAsync({ metricId: m.id, newValue });
                toast.success("Metric updated");
              } catch {
                toast.error("Failed to update metric — try again");
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Metric Row ──

function MetricRow({
  metric,
  canWrite,
  alignment,
  onUpdateValue,
}: {
  metric: BetMetric;
  canWrite: boolean;
  alignment?: { aligned: number; total: number };
  onUpdateValue: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(metric.current_value));
  const prevStatusRef = useRef(metric.status);
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Status transition animation
  useEffect(() => {
    if (prevStatusRef.current !== metric.status) {
      setAnimating(true);
      prevStatusRef.current = metric.status;
      const timer = setTimeout(() => setAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [metric.status]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Guard against zero/negative target
  const safeTarget = Math.max(0.001, metric.target_value);
  const pct = Math.min(100, Math.max(0, Math.round((metric.current_value / safeTarget) * 100)));

  const cancelEdit = () => {
    setDraft(String(metric.current_value));
    setEditing(false);
  };

  const handleCommit = async () => {
    const parsed = parseFloat(draft);
    if (isNaN(parsed) || parsed < 0) {
      cancelEdit();
      return;
    }
    setEditing(false);
    await onUpdateValue(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const noAlignment = alignment && alignment.aligned === 0 && alignment.total > 0;

  return (
    <div className={cn(
      "border rounded-sm px-3 py-2 bg-background transition-all duration-500",
      animating && "ring-1 ring-foreground/20",
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium truncate">{metric.metric_name}</span>
        <span className={cn(
          "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm border transition-colors duration-500 shrink-0 ml-2",
          STATUS_COLORS[metric.status],
        )}>
          {metric.status}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn("h-full rounded-full transition-all duration-500", BAR_COLORS[metric.status])}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
          {canWrite && editing ? (
            <input
              ref={inputRef}
              autoFocus
              type="number"
              min="0"
              step="any"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              className="w-14 border rounded-sm px-1 py-0.5 text-[10px] bg-background text-right focus:outline-none focus:ring-1 focus:ring-foreground"
              aria-label={`Current value for ${metric.metric_name}`}
            />
          ) : (
            <span
              onClick={() => {
                if (!canWrite) return;
                setDraft(String(metric.current_value));
                setEditing(true);
              }}
              className={cn(canWrite && "cursor-pointer hover:text-foreground")}
              role={canWrite ? "button" : undefined}
              tabIndex={canWrite ? 0 : undefined}
              onKeyDown={canWrite ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDraft(String(metric.current_value));
                  setEditing(true);
                }
              } : undefined}
              aria-label={canWrite ? `Edit value for ${metric.metric_name}` : undefined}
            >
              {formatCompact(metric.current_value)}
            </span>
          )}
          <span className="text-muted-foreground/60"> / {formatCompact(metric.target_value)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[10px] text-muted-foreground/60">{metric.outcome_key}</span>
        {alignment && (
          <span className={cn(
            "text-[10px] tabular-nums",
            noAlignment ? "text-signal-red" : "text-muted-foreground/50",
          )}>
            {alignment.aligned} of {alignment.total} aligned
          </span>
        )}
      </div>
    </div>
  );
}

// ── Add Metric Form ──

function AddMetricForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (data: { outcome_key: string; metric_name: string; target_value: number }) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [outcomeKey, setOutcomeKey] = useState("");
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetValue);
    if (!outcomeKey.trim() || !metricName.trim() || isNaN(target) || target <= 0) return;
    await onSubmit({ outcome_key: outcomeKey.trim(), metric_name: metricName.trim(), target_value: target });
  };

  const inputClass = "w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <form onSubmit={handleSubmit} className="border rounded-sm p-3 mb-3 space-y-2.5 bg-muted/30">
      <div>
        <label htmlFor="metric-outcome" className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Outcome Key</label>
        <input id="metric-outcome" required value={outcomeKey} onChange={(e) => setOutcomeKey(e.target.value)} placeholder="e.g. retention" className={inputClass} />
      </div>
      <div>
        <label htmlFor="metric-name" className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Metric Name</label>
        <input id="metric-name" required value={metricName} onChange={(e) => setMetricName(e.target.value)} placeholder="e.g. 90-day churn rate" className={inputClass} />
      </div>
      <div>
        <label htmlFor="metric-target" className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Target Value</label>
        <input id="metric-target" required type="number" min="0.01" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="100" className={inputClass} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={submitting || !outcomeKey.trim() || !metricName.trim()} className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-1.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50">
          {submitting ? "Adding…" : "Add Metric"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}
