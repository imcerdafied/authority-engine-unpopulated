import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDecisions, useUpdateDecision, useDecisionRisks, useLogActivity, useDecisionActivity } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import StatusBadge from "@/components/StatusBadge";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import ProjectionPanel from "@/components/ProjectionPanel";
import { cn } from "@/lib/utils";

const fieldLabels: Record<string, string> = {
  title: "Title",
  trigger_signal: "Trigger Signal",
  outcome_target: "Outcome Target",
  expected_impact: "Expected Impact",
  exposure_value: "Exposure",
  current_delta: "Current Delta",
  revenue_at_risk: "Enterprise Exposure",
  segment_impact: "Segment",
  owner: "Owner",
};

function InlineEdit({
  value,
  field,
  decisionId,
  canEdit,
  onSave,
  logActivity,
  className,
  placeholder = "—",
  variant = "default",
}: {
  value: string;
  field: string;
  decisionId: string;
  canEdit: boolean;
  onSave: (id: string, field: string, oldValue: string, newValue: string) => Promise<void>;
  logActivity?: (decisionId: string, field: string, oldValue: string | null, newValue: string | null) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  variant?: "default" | "title";
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(value);
      inputRef.current?.focus();
    }
  }, [editing, value]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    const oldVal = (value ?? "").trim();
    if (trimmed !== oldVal) {
      await onSave(decisionId, field, oldVal || "", trimmed);
      logActivity?.(decisionId, field, oldVal || null, trimmed || null)?.catch(() => {});
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setEditing(false);
    }
  };

  if (!canEdit) {
    const display = value || placeholder;
    const isEmpty = !value;
    return (
      <span className={cn(isEmpty && "text-muted-foreground/50 italic", className)}>
        {display}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "border rounded bg-background w-full",
          variant === "title" ? "text-sm font-semibold px-2 py-1.5" : "text-sm px-2 py-1"
        )}
      />
    );
  }

  const display = value || placeholder;
  const isEmpty = !value;
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 min-h-[1.5em] inline-block",
        variant === "title" && "text-sm font-semibold",
        isEmpty && "text-muted-foreground/50 italic",
        className
      )}
    >
      {display}
    </span>
  );
}

const categoryLabels: Record<string, string> = {
  arr: "ARR",
  renewal_retention: "Renewal & Retention",
  strategic_positioning: "Strategic Positioning",
  dpi_adoption: "DPI Adoption",
  agent_trust: "Agent Trust",
  live_event_risk: "Live Event Risk",
  operational_efficiency: "Operational Efficiency",
};

function relativeTime(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function staleness(updatedAt: string): { label: string; dotClass: string; textClass: string; pulse: boolean } {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 3) return { label: `Updated ${days}d ago`, dotClass: "bg-signal-green", textClass: "text-signal-green", pulse: false };
  if (days <= 7) return { label: `${days}d since update`, dotClass: "bg-signal-amber", textClass: "text-signal-amber", pulse: false };
  return { label: `No movement in ${days}d`, dotClass: "bg-signal-red", textClass: "text-signal-red", pulse: true };
}

function DecisionActivityFeed({ decisionId }: { decisionId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: activity = [], isLoading } = useDecisionActivity(decisionId);

  return (
    <div className="mt-3 pt-3 border-t">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        Activity ({activity.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5 text-xs">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground italic">No changes recorded yet</p>
          ) : (
            activity.map((a: any) => {
              const label = fieldLabels[a.field_name] ?? a.field_name;
              const oldVal = a.old_value ?? "(empty)";
              const newVal = a.new_value ?? "(empty)";
              const when = a.created_at ? relativeTime(a.created_at) : "";
              return (
                <p key={a.id} className="text-muted-foreground">
                  {label} changed from {oldVal} → {newVal}
                  {when && <span className="ml-1.5 text-muted-foreground/70">· {when}</span>}
                </p>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function Decisions() {
  const qc = useQueryClient();
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { isLoading: risksLoading } = useDecisionRisks();
  const updateDecision = useUpdateDecision();
  const logActivity = useLogActivity();
  const { currentRole } = useOrg();
  const [showCreate, setShowCreate] = useState(false);

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const handleInlineSave = async (id: string, field: string, oldValue: string, newValue: string) => {
    await updateDecision.mutateAsync({ id, [field]: newValue || null } as any);
    qc.invalidateQueries({ queryKey: ["decision_activity", id] });
  };

  if (decisionsLoading || risksLoading) return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;

  const activeDecisions = decisions.filter((d) => d.status === "active" && !!d.activated_at);
  const activeHighImpact = activeDecisions.filter((d) => d.impact_tier === "High");
  const atCapacity = activeHighImpact.length >= 5;
  const isEmpty = decisions.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Decisions</h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">
              {activeHighImpact.length}/5 Active{atCapacity ? " · At capacity" : ""}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {decisions.length} total · {activeDecisions.length} active
          </p>
        </div>
        {canWrite && !showCreate && !atCapacity && (
          <button onClick={() => setShowCreate(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors">
            + Register Decision
          </button>
        )}
      </div>

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

      {isEmpty && !showCreate ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No decisions registered.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Register first high-impact decision to initiate constraint.</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground/50">
            <span>Hard cap: 5</span><span>10-day slice rule</span><span>Outcome required</span><span>Owner required</span>
          </div>
        </div>
      ) : (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">All Decisions ({decisions.length})</h2>
          <div className="space-y-2">
            {decisions.map((d) => {
              const isActive = d.status === "active";

              return (
                <div key={d.id} className={cn("border rounded-md p-4", d.is_exceeded ? "border-signal-red/40 bg-signal-red/5" : d.is_aging ? "border-signal-amber/40" : "")}>
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-start gap-2 flex-wrap">
                      <StatusBadge status={d.solution_domain} />
                      {d.is_aging && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Aging</span>}
                      {d.is_unbound && <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Unbound — no authority</span>}
                      {d.needs_exec_attention && <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider">Executive Attention Required</span>}
                    </div>
                    {(() => {
                      const s = staleness(d.updated_at);
                      return (
                        <span className={cn("text-[11px] font-medium flex items-center gap-1.5 shrink-0", s.textClass)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", s.dotClass, s.pulse && "animate-pulse")} />
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="mb-1">
                    <InlineEdit
                      value={d.title ?? ""}
                      field="title"
                      decisionId={d.id}
                      canEdit={canWrite}
                      onSave={handleInlineSave}
                      logActivity={logActivity}
                      variant="title"
                      placeholder="Untitled"
                    />
                  </div>
                  <div className="mb-3">
                    <InlineEdit
                      value={d.trigger_signal ?? ""}
                      field="trigger_signal"
                      decisionId={d.id}
                      canEdit={canWrite}
                      onSave={handleInlineSave}
                      logActivity={logActivity}
                      className="text-xs text-muted-foreground block"
                      placeholder="Add trigger signal…"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                    <div><span className="text-muted-foreground">Surface</span><p className="font-medium mt-0.5">{d.surface}</p></div>
                    <div><span className="text-muted-foreground">Outcome Target</span><div className="font-medium mt-0.5"><InlineEdit value={d.outcome_target ?? ""} field="outcome_target" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    {(d.outcome_category_key || d.outcome_category) && (
                      <div><span className="text-muted-foreground">Category</span><p className="font-medium mt-0.5">{categoryLabels[(d.outcome_category_key ?? d.outcome_category) as string] ?? (d.outcome_category_key ?? d.outcome_category)}</p></div>
                    )}
                    <div><span className="text-muted-foreground">Expected Impact</span><div className="font-medium mt-0.5"><InlineEdit value={d.expected_impact ?? ""} field="expected_impact" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                    <div><span className="text-muted-foreground">Exposure</span><div className="font-semibold mt-0.5 text-signal-amber"><InlineEdit value={d.exposure_value ?? ""} field="exposure_value" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    <div><span className="text-muted-foreground">Current Delta</span><div className="font-semibold mt-0.5 text-signal-amber"><InlineEdit value={d.current_delta ?? ""} field="current_delta" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    <div><span className="text-muted-foreground">Enterprise Exposure</span><div className="font-semibold mt-0.5 text-signal-red"><InlineEdit value={d.revenue_at_risk ?? ""} field="revenue_at_risk" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    <div><span className="text-muted-foreground">Segment</span><div className="font-medium mt-0.5"><InlineEdit value={d.segment_impact ?? ""} field="segment_impact" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    <div><span className="text-muted-foreground">Owner</span><div className="font-medium mt-0.5"><InlineEdit value={d.owner ?? ""} field="owner" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                  </div>

                  {d.blocked_reason && (
                    <div className="mt-3 pt-3 border-t text-xs">
                      <p className="text-muted-foreground">Blocked: {d.blocked_reason}</p>
                      {d.blocked_dependency_owner && <p className="text-muted-foreground mt-0.5">Dependency: {d.blocked_dependency_owner}</p>}
                    </div>
                  )}

                  {isActive && (
                    <ProjectionPanel decision={d} />
                  )}

                  <DecisionActivityFeed decisionId={d.id} />
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
