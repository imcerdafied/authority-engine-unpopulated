import { useState } from "react";
import { useInitiatives, useAddInitiative, useUpdateInitiative, useDeleteInitiative } from "@/hooks/useInitiatives";
import { useMetrics } from "@/hooks/useMetrics";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BetInitiative } from "@/lib/types";

interface InitiativesPanelProps {
  betId: string;
  canWrite: boolean;
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

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Initiatives</span>
        <p className="text-xs text-muted-foreground mt-2">Loading…</p>
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
            await addInit.mutateAsync(data);
            setShowAdd(false);
            toast.success("Initiative added");
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
            onUpdate={async (updates) => {
              await updateInit.mutateAsync({ id: init.id, ...updates });
              toast.success("Initiative updated");
            }}
            onDelete={async () => {
              await deleteInit.mutateAsync(init.id);
              setExpandedId(null);
              toast.success("Initiative removed");
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
  onUpdate,
  onDelete,
  updating,
}: {
  initiative: BetInitiative;
  expanded: boolean;
  onToggle: () => void;
  canWrite: boolean;
  outcomeKeys: string[];
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

  return (
    <div className="border rounded-sm bg-background">
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-start gap-3"
      >
        {/* Rank */}
        <span className="text-lg font-bold text-muted-foreground/60 tabular-nums leading-tight min-w-[1.5rem] text-right">
          {init.roadmap_position}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">{init.description}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <span className="text-xs font-medium tabular-nums">
              V³ {init.score_v3.toFixed(2)}
            </span>
            <span className={cn("text-[10px] font-semibold tabular-nums", deltaColor)}>
              {deltaIcon} {deltaSign}{Math.abs(init.last_score_delta).toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              V:{init.value} × C:{init.confidence} × M:{init.outcome_multiplier.toFixed(2)} / E:{init.effort}
            </span>
          </div>
          {init.aligned_outcomes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {init.aligned_outcomes.map((o) => (
                <span key={o} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                  {o}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <span className="text-[10px] text-muted-foreground mt-1">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && canWrite && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          <SliderField label="Value" value={value} onChange={setValue} min={1} max={10} step={1} />
          <SliderField label="Confidence" value={confidence} onChange={setConfidence} min={0} max={1} step={0.05} decimals={2} />
          <SliderField label="Effort" value={effort} onChange={setEffort} min={1} max={10} step={1} />

          {outcomeKeys.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">
                Aligned Outcomes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {outcomeKeys.map((key) => {
                  const active = aligned.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAligned(active ? aligned.filter((k) => k !== key) : [...aligned, key])}
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
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={async () => {
                await onUpdate({ value, confidence, effort, aligned_outcomes: aligned });
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
    await onSubmit({ description: description.trim(), value, confidence, effort, aligned_outcomes: aligned });
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-sm p-3 mb-3 space-y-3 bg-muted/30">
      <div>
        <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">Description</label>
        <input
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will this initiative accomplish?"
          className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      <SliderField label="Value" value={value} onChange={setValue} min={1} max={10} step={1} />
      <SliderField label="Confidence" value={confidence} onChange={setConfidence} min={0} max={1} step={0.05} decimals={2} />
      <SliderField label="Effort" value={effort} onChange={setEffort} min={1} max={10} step={1} />

      {outcomeKeys.length > 0 && (
        <div>
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block mb-1">
            Aligned Outcomes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {outcomeKeys.map((key) => {
              const active = aligned.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAligned(active ? aligned.filter((k) => k !== key) : [...aligned, key])}
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
        </div>
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

// ── Slider Field ──

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  decimals = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="text-xs font-medium tabular-nums">{value.toFixed(decimals)}</span>
      </div>
      <Slider
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
