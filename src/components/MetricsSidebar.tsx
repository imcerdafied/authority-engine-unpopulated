import { useState } from "react";
import { useMetrics, useAddMetric, useUpdateMetricValue } from "@/hooks/useMetrics";
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

export default function MetricsSidebar({ betId, canWrite }: MetricsSidebarProps) {
  const { data: metrics = [], isLoading } = useMetrics(betId);
  const addMetric = useAddMetric(betId);
  const updateValue = useUpdateMetricValue(betId);
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Outcome Metrics</span>
        <p className="text-xs text-muted-foreground mt-2">Loading…</p>
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
            await addMetric.mutateAsync(data);
            setShowAdd(false);
            toast.success("Metric defined");
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
            onUpdateValue={async (newValue) => {
              await updateValue.mutateAsync({ metricId: m.id, newValue });
              toast.success("Metric updated");
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
  onUpdateValue,
}: {
  metric: BetMetric;
  canWrite: boolean;
  onUpdateValue: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(metric.current_value));

  const pct = metric.target_value > 0
    ? Math.min(100, Math.round((metric.current_value / metric.target_value) * 100))
    : 0;

  const handleCommit = async () => {
    const parsed = parseFloat(draft);
    if (isNaN(parsed)) {
      setDraft(String(metric.current_value));
      setEditing(false);
      return;
    }
    setEditing(false);
    await onUpdateValue(parsed);
  };

  return (
    <div className="border rounded-sm px-3 py-2 bg-background">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium truncate">{metric.metric_name}</span>
        <span className={cn("text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm border", STATUS_COLORS[metric.status])}>
          {metric.status}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", BAR_COLORS[metric.status])}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
          {canWrite && editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={(e) => e.key === "Enter" && handleCommit()}
              className="w-12 border rounded-sm px-1 py-0.5 text-[10px] bg-background text-right focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          ) : (
            <span
              onClick={() => {
                if (!canWrite) return;
                setDraft(String(metric.current_value));
                setEditing(true);
              }}
              className={cn(canWrite && "cursor-pointer hover:text-foreground")}
            >
              {metric.current_value}
            </span>
          )}
          <span className="text-muted-foreground/60"> / {metric.target_value}</span>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground/60 mt-0.5">{metric.outcome_key}</div>
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
        <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Outcome Key</label>
        <input required value={outcomeKey} onChange={(e) => setOutcomeKey(e.target.value)} placeholder="e.g. retention" className={inputClass} />
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Metric Name</label>
        <input required value={metricName} onChange={(e) => setMetricName(e.target.value)} placeholder="e.g. 90-day churn rate" className={inputClass} />
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Target Value</label>
        <input required type="number" min="0.01" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="100" className={inputClass} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={submitting} className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-1.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50">
          {submitting ? "Adding…" : "Add Metric"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}
