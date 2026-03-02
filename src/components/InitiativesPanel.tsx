import { useState, useMemo } from "react";
import { useInitiatives, useAddInitiative, useUpdateInitiative, useDeleteInitiative } from "@/hooks/useInitiatives";
import { useMetrics } from "@/hooks/useMetrics";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BetInitiative, BetMetric } from "@/lib/types";

interface InitiativesPanelProps {
  betId: string;
  canWrite: boolean;
}

/** Map outcome_key to the worst metric status for that outcome. */
function buildOutcomeStatusMap(metrics: BetMetric[]): Map<string, BetMetric["status"]> {
  const map = new Map<string, BetMetric["status"]>();
  const priority: Record<BetMetric["status"], number> = { OffTrack: 0, AtRisk: 1, OnTrack: 2 };
  for (const m of metrics) {
    const existing = map.get(m.outcome_key);
    if (!existing || priority[m.status] < priority[existing]) {
      map.set(m.outcome_key, m.status);
    }
  }
  return map;
}

const OUTCOME_PILL_COLORS: Record<BetMetric["status"], string> = {
  OnTrack: "bg-signal-green/15 text-signal-green border-signal-green/25",
  AtRisk: "bg-signal-amber/15 text-signal-amber border-signal-amber/25",
  OffTrack: "bg-signal-red/15 text-signal-red border-signal-red/25",
};

const OUTCOME_PILL_GREY = "bg-muted text-muted-foreground";

// ── Skeleton ──

function InitiativeSkeleton() {
  return (
    <div className="border rounded-sm bg-background px-3 py-2.5 space-y-2 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-sm bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded-sm w-3/4" />
          <div className="h-2.5 bg-muted rounded-sm w-1/2" />
          <div className="flex gap-1 mt-1">
            <div className="h-4 w-12 bg-muted rounded-sm" />
            <div className="h-4 w-10 bg-muted rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InitiativesPanel({ betId, canWrite }: InitiativesPanelProps) {
  const { data: initiatives = [], isLoading } = useInitiatives(betId);
  const { data: metrics = [] } = useMetrics(betId);
  const addInit = useAddInitiative(betId);
  const updateInit = useUpdateInitiative(betId);
  const deleteInit = useDeleteInitiative(betId);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const outcomeKeys = [...new Set(metrics.map((m) => m.outcome_key))];
  const outcomeStatusMap = useMemo(() => buildOutcomeStatusMap(metrics), [metrics]);

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Initiatives</span>
        <div className="mt-2 space-y-2">
          <InitiativeSkeleton />
          <InitiativeSkeleton />
        </div>
      </div>
    );
  }

  if (initiatives.length === 0 && !showAdd) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Initiatives</span>
          {canWrite && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add Initiative
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
          Initiatives ({initiatives.length})
        </span>
        {canWrite && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add Initiative
          </button>
        )}
      </div>

      {showAdd && (
        <AddInitiativeForm
          outcomeKeys={outcomeKeys}
          onSubmit={async (data) => {
            try {
              await addInit.mutateAsync(data);
              setShowAdd(false);
              toast.success("Initiative added");
            } catch {
              toast.error("Failed to add initiative — try again");
            }
          }}
          onCancel={() => setShowAdd(false)}
          submitting={addInit.isPending}
        />
      )}

      <div className="space-y-2">
        {initiatives.map((init) => (
          <InitiativeCard
            key={init.id}
            initiative={init}
            expanded={expandedId === init.id}
            onToggle={() => setExpandedId(expandedId === init.id ? null : init.id)}
            canWrite={canWrite}
            outcomeKeys={outcomeKeys}
            outcomeStatusMap={outcomeStatusMap}
            onUpdate={async (updates) => {
              try {
                await updateInit.mutateAsync({ id: init.id, ...updates });
                toast.success("Initiative updated");
              } catch {
                toast.error("Failed to update — try again");
              }
            }}
            onDelete={async () => {
              try {
                await deleteInit.mutateAsync(init.id);
                setExpandedId(null);
                toast.success("Initiative removed");
              } catch {
                toast.error("Failed to delete — try again");
              }
            }}
            updating={updateInit.isPending}
          />
        ))}
      </div>
    </div>
  );
}

// ── Initiative Card ──

function InitiativeCard({
  initiative: init,
  expanded,
  onToggle,
  canWrite,
  outcomeKeys,
  outcomeStatusMap,
  onUpdate,
  onDelete,
  updating,
}: {
  initiative: BetInitiative;
  expanded: boolean;
  onToggle: () => void;
  canWrite: boolean;
  outcomeKeys: string[];
  outcomeStatusMap: Map<string, BetMetric["status"]>;
  onUpdate: (updates: Partial<BetInitiative>) => Promise<void>;
  onDelete: () => Promise<void>;
  updating: boolean;
}) {
  const [value, setValue] = useState(init.value);
  const [confidence, setConfidence] = useState(init.confidence);
  const [effort, setEffort] = useState(init.effort);
  const [aligned, setAligned] = useState<string[]>(init.aligned_outcomes);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deltaSign = init.last_score_delta > 0 ? "+" : init.last_score_delta < 0 ? "" : "";
  const deltaColor = init.last_score_delta > 0
    ? "text-signal-green"
    : init.last_score_delta < 0
      ? "text-signal-red"
      : "text-muted-foreground";
  const deltaIcon = init.last_score_delta > 0 ? "▲" : init.last_score_delta < 0 ? "▼" : "–";

  const alignedCount = init.aligned_outcomes.length;

  // Truncate long descriptions in collapsed view
  const maxDescLen = 80;
  const descTruncated = init.description.length > maxDescLen;
  const displayDesc = descTruncated && !expanded
    ? init.description.slice(0, maxDescLen) + "…"
    : init.description;

  return (
    <div className={cn(
      "border rounded-sm bg-background transition-all duration-200",
      updating && "opacity-70",
    )}>
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-start gap-3"
        aria-expanded={expanded}
      >
        {/* Rank */}
        <span className="text-lg font-bold text-muted-foreground/60 tabular-nums leading-tight min-w-[1.5rem] text-right">
          {init.roadmap_position}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">{displayDesc}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <span className="text-xs font-medium tabular-nums">
              V³ {init.score_v3.toFixed(2)}
            </span>
            <span className={cn("text-[10px] font-semibold tabular-nums", deltaColor)}>
              {deltaIcon} {deltaSign}{Math.abs(init.last_score_delta).toFixed(2)}
            </span>
            {/* Multiplier badge */}
            <span
              className={cn(
                "text-[10px] font-semibold tabular-nums px-1 py-px rounded-sm",
                init.outcome_multiplier > 1
                  ? "bg-signal-green/10 text-signal-green"
                  : "text-muted-foreground",
              )}
              title={
                alignedCount > 0
                  ? `Aligned to ${alignedCount} outcome${alignedCount !== 1 ? "s" : ""} — each adds 0.15x boost`
                  : "No outcome alignment — multiplier is 1.0x"
              }
            >
              {init.outcome_multiplier.toFixed(2)}x
            </span>
          </div>
          {/* Outcome pills — color-coded by metric status */}
          {init.aligned_outcomes.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {init.aligned_outcomes.map((o) => {
                const status = outcomeStatusMap.get(o);
                const pillClass = status
                  ? OUTCOME_PILL_COLORS[status]
                  : OUTCOME_PILL_GREY;
                return (
                  <span
                    key={o}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-sm border border-transparent",
                      pillClass,
                    )}
                  >
                    {o}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/50 mt-1.5">
              No outcome alignment — multiplier is 1.0x
            </p>
          )}
        </div>

        {/* Expand indicator */}
        <span className="text-[10px] text-muted-foreground mt-1" aria-hidden="true">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && canWrite && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          <SliderField label="Value" id={`val-${init.id}`} value={value} onChange={setValue} min={1} max={10} step={1} />
          <SliderField label="Confidence" id={`conf-${init.id}`} value={confidence} onChange={setConfidence} min={0} max={1} step={0.05} decimals={2} />
          <SliderField label="Effort" id={`eff-${init.id}`} value={effort} onChange={setEffort} min={1} max={10} step={1} />

          {outcomeKeys.length > 0 && (
            <fieldset>
              <legend className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">
                Aligned Outcomes
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {outcomeKeys.map((key) => {
                  const active = aligned.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAligned(active ? aligned.filter((k) => k !== key) : [...aligned, key])}
                      aria-pressed={active}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-sm border transition-colors",
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-muted-foreground border-border hover:border-foreground"
                      )}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={async () => {
                // Enforce effort floor of 1
                const safeEffort = Math.max(1, effort);
                await onUpdate({ value, confidence, effort: safeEffort, aligned_outcomes: aligned });
              }}
              disabled={updating}
              className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-1.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {updating ? "Saving…" : "Save"}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-[11px] text-muted-foreground hover:text-signal-red transition-colors"
              >
                Delete
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <button
                  onClick={onDelete}
                  className="text-[11px] font-semibold text-signal-red hover:underline"
                >
                  Confirm delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] text-muted-foreground"
                >
                  Cancel
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Initiative Form ──

function AddInitiativeForm({
  outcomeKeys,
  onSubmit,
  onCancel,
  submitting,
}: {
  outcomeKeys: string[];
  onSubmit: (data: { description: string; value: number; confidence: number; effort: number; aligned_outcomes: string[] }) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState(5);
  const [confidence, setConfidence] = useState(0.5);
  const [effort, setEffort] = useState(5);
  const [aligned, setAligned] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    // Enforce effort floor of 1
    const safeEffort = Math.max(1, effort);
    await onSubmit({ description: description.trim(), value, confidence, effort: safeEffort, aligned_outcomes: aligned });
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-sm p-3 mb-3 space-y-3 bg-muted/30">
      <div>
        <label htmlFor="init-desc" className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Description</label>
        <input
          id="init-desc"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will this initiative accomplish?"
          className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      <SliderField label="Value" id="init-val" value={value} onChange={setValue} min={1} max={10} step={1} />
      <SliderField label="Confidence" id="init-conf" value={confidence} onChange={setConfidence} min={0} max={1} step={0.05} decimals={2} />
      <SliderField label="Effort" id="init-eff" value={effort} onChange={setEffort} min={1} max={10} step={1} />

      {outcomeKeys.length > 0 && (
        <fieldset>
          <legend className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Aligned Outcomes
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {outcomeKeys.map((key) => {
              const active = aligned.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAligned(active ? aligned.filter((k) => k !== key) : [...aligned, key])}
                  aria-pressed={active}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-sm border transition-colors",
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground"
                  )}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-1.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add Initiative"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Slider calibration labels ──

const VALUE_LABELS: [number, string][] = [
  [2, "Marginal impact"],
  [4, "Incremental improvement"],
  [6, "Meaningful advancement"],
  [8, "High impact"],
  [10, "Transformative"],
];

const CONFIDENCE_LABELS: [number, string][] = [
  [0.2, "Speculative"],
  [0.4, "Hypothesis"],
  [0.6, "Probable"],
  [0.8, "High confidence"],
  [1.0, "Near-certain"],
];

const EFFORT_LABELS: [number, string][] = [
  [2, "Days of work"],
  [4, "A sprint or two"],
  [6, "Multi-sprint"],
  [8, "Quarter-long"],
  [10, "Multi-quarter"],
];

function getCalibrationLabel(value: number, thresholds: [number, string][]): string {
  for (const [max, label] of thresholds) {
    if (value <= max) return label;
  }
  return thresholds[thresholds.length - 1][1];
}

const SLIDER_CALIBRATIONS: Record<string, [number, string][]> = {
  Value: VALUE_LABELS,
  Confidence: CONFIDENCE_LABELS,
  Effort: EFFORT_LABELS,
};

// ── Slider Field ──

function SliderField({
  label,
  id,
  value,
  onChange,
  min,
  max,
  step,
  decimals = 0,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}) {
  const calibration = SLIDER_CALIBRATIONS[label];
  const calibrationLabel = calibration ? getCalibrationLabel(value, calibration) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          {calibrationLabel && (
            <span className="text-[10px] text-muted-foreground/60">{calibrationLabel}</span>
          )}
          <span className="text-xs font-medium tabular-nums" aria-live="polite">{value.toFixed(decimals)}</span>
        </div>
      </div>
      <Slider
        id={id}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}
