import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDecisions, useUpdateDecision, useDecisionRisks } from "@/hooks/useOrgData";
import { useLogActivity, useDecisionActivity } from "@/hooks/useDecisionActivity";
import { useInterruptions, useCreateInterruption } from "@/hooks/useInterruptions";
import { useOrg } from "@/contexts/OrgContext";
import StatusBadge from "@/components/StatusBadge";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import ProjectionPanel from "@/components/ProjectionPanel";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS = [
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "escalation", label: "Escalation" },
  { value: "deal_request", label: "Deal Request" },
  { value: "support", label: "Support" },
  { value: "executive_override", label: "Executive Override" },
] as const;

const SOURCE_COLORS: Record<string, string> = {
  ad_hoc: "bg-muted text-muted-foreground",
  escalation: "bg-signal-red/20 text-signal-red",
  deal_request: "bg-signal-amber/20 text-signal-amber",
  support: "bg-signal-amber/20 text-signal-amber",
  executive_override: "bg-signal-red/20 text-signal-red",
};

const fieldLabels: Record<string, string> = {
  title: "Title",
  trigger_signal: "Trigger Signal",
  outcome_target: "Outcome Target",
  expected_impact: "Expected Impact",
  exposure_value: "Exposure",
  current_delta: "Current Delta",
  revenue_at_risk: "Enterprise Exposure",
  owner: "Owner",
  status: "Status",
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
  inputType = "text",
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
  inputType?: "text" | "number";
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
        type={inputType}
        min={inputType === "number" ? 0 : undefined}
        max={inputType === "number" ? 100 : undefined}
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

function staleness(updatedAt: string): { days: number; label: string; dotClass: string; textClass: string; pulse: boolean; isAmber: boolean; isRed: boolean } {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 3) return { days, label: `Updated ${days}d ago`, dotClass: "bg-signal-green", textClass: "text-signal-green", pulse: false, isAmber: false, isRed: false };
  if (days <= 7) return { days, label: `${days}d since update`, dotClass: "bg-signal-amber", textClass: "text-signal-amber", pulse: false, isAmber: true, isRed: false };
  return { days, label: `No movement in ${days}d`, dotClass: "bg-signal-red", textClass: "text-signal-red", pulse: true, isAmber: false, isRed: true };
}

function nudgeMailto(betTitle: string, days: number, owner: string, exposure: string): string {
  const subject = encodeURIComponent(`Build Authority — ${betTitle} needs attention`);
  const body = encodeURIComponent(
    `${betTitle} has had no movement in ${days} days.\nOwner: ${owner}\nExposure: ${exposure}\n\nPlease update your bet at https://buildauthorityos.com`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

function ResourceRealitySection({
  decision: d,
  canWrite,
  handleInlineSave,
  logActivity,
  createInterruption,
  updateDecision,
  qc,
}: {
  decision: any;
  canWrite: boolean;
  handleInlineSave: (id: string, field: string, oldValue: string, newValue: string) => Promise<void>;
  logActivity: (decisionId: string, field: string, oldValue: string | null, newValue: string | null) => void | Promise<void>;
  createInterruption: ReturnType<typeof useCreateInterruption>;
  updateDecision: ReturnType<typeof useUpdateDecision>;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [interruptExpanded, setInterruptExpanded] = useState(false);
  const [logFormExpanded, setLogFormExpanded] = useState(false);
  const [logDesc, setLogDesc] = useState("");
  const [logSource, setLogSource] = useState("ad_hoc");
  const [logEngineers, setLogEngineers] = useState(0);
  const [logDays, setLogDays] = useState(0);
  const [logImpact, setLogImpact] = useState("");

  const { data: interruptions = [] } = useInterruptions(d.id);
  const capacityAllocated = (d.capacity_allocated ?? 0) as number;
  const capacityDiverted = (d.capacity_diverted ?? 0) as number;
  const unplannedInterrupts = (d.unplanned_interrupts ?? 0) as number;
  const escalationCount = (d.escalation_count ?? 0) as number;
  const netCapacity = Math.max(0, capacityAllocated - capacityDiverted);

  const netCapacityClass =
    netCapacity > 60 ? "text-signal-green" : netCapacity > 30 ? "text-signal-amber" : "text-signal-red";

  const handleLogInterruption = async () => {
    if (!logDesc.trim()) return;
    try {
      await createInterruption.mutateAsync({
        decision_id: d.id,
        description: logDesc.trim(),
        source: logSource,
        engineers_diverted: logEngineers,
        estimated_days: logDays,
        impact_note: logImpact.trim() || undefined,
      });
      const addDiverted = Math.min(100 - capacityDiverted, Math.round((logEngineers * logDays) / 5));
      await updateDecision.mutateAsync({
        id: d.id,
        unplanned_interrupts: unplannedInterrupts + 1,
        escalation_count: logSource === "escalation" ? escalationCount + 1 : escalationCount,
        capacity_diverted: Math.min(100, capacityDiverted + addDiverted),
      } as any);
      qc.invalidateQueries({ queryKey: ["decisions"] });
      setLogFormExpanded(false);
      setLogDesc("");
      setLogSource("ad_hoc");
      setLogEngineers(0);
      setLogDays(0);
      setLogImpact("");
    } catch (e) {
      console.error(e);
    }
  };

  const grayPct = Math.max(0, 100 - capacityAllocated - capacityDiverted);

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resource Reality</p>
      <div className="space-y-2">
        <div className="h-2 rounded-full overflow-hidden flex bg-muted">
          <div className="bg-signal-green" style={{ width: `${capacityAllocated}%` }} />
          <div className="bg-signal-red" style={{ width: `${capacityDiverted}%` }} />
          <div className="bg-muted-foreground/20" style={{ width: `${grayPct}%` }} />
        </div>
        <div className="flex gap-4 text-[10px]">
          <span className="text-signal-green">Allocated: <InlineEdit value={String(capacityAllocated)} field="capacity_allocated" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} inputType="number" />%</span>
          <span className="text-signal-red">Diverted: <InlineEdit value={String(capacityDiverted)} field="capacity_diverted" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} inputType="number" />%</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        <span>Interrupts: {unplannedInterrupts}</span>
        <span>Escalations: {escalationCount}</span>
        <span className={netCapacityClass}>Net Capacity: {netCapacity}%</span>
      </div>
      {capacityDiverted > 20 && (
        <div className="border-l-2 border-signal-red bg-signal-red/5 p-3 rounded-r-md">
          <p className="text-[12px] text-signal-red font-medium">
            ⚠ {capacityDiverted}% capacity diverted. Estimated slip: ~{Math.ceil(capacityDiverted / 10)} weeks. Exposure at risk: {d.revenue_at_risk || d.exposure_value || "—"}
          </p>
        </div>
      )}
      <div className="pt-2">
        <button
          onClick={() => setInterruptExpanded(!interruptExpanded)}
          className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Interruptions ({interruptions.length})
        </button>
        {interruptExpanded && (
          <div className="mt-2 space-y-2">
            {interruptions.length === 0 ? (
              <p className="text-muted-foreground/50 italic text-xs">No interruptions logged</p>
            ) : (
              interruptions.map((i: any) => (
                <div key={i.id} className="text-xs border rounded p-2 bg-muted/20">
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded", SOURCE_COLORS[i.source] ?? "bg-muted")}>
                    {SOURCE_OPTIONS.find((o) => o.value === i.source)?.label ?? i.source}
                  </span>
                  <p className="font-medium mt-1">{i.description}</p>
                  <p className="text-muted-foreground text-[10px]">{i.engineers_diverted} engineers · {i.estimated_days} days</p>
                  <p className="text-[10px] text-muted-foreground">{i.created_at ? relativeTime(i.created_at) : ""}</p>
                </div>
              ))
            )}
            {canWrite && (
              <>
                {!logFormExpanded ? (
                  <button
                    onClick={() => setLogFormExpanded(true)}
                    className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1 rounded-sm hover:bg-foreground hover:text-background transition-colors"
                  >
                    Log Interruption
                  </button>
                ) : (
                  <div className="mt-2 p-3 border rounded bg-muted/30 space-y-2">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
                      <input
                        value={logDesc}
                        onChange={(e) => setLogDesc(e.target.value)}
                        placeholder="Required"
                        className="w-full text-xs border rounded px-2 py-1.5 bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Source</label>
                      <select value={logSource} onChange={(e) => setLogSource(e.target.value)} className="text-xs border rounded px-2 py-1.5 bg-background w-full">
                        {SOURCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Engineers Diverted</label>
                        <input type="number" min={0} value={logEngineers} onChange={(e) => setLogEngineers(parseInt(e.target.value, 10) || 0)} className="w-full text-xs border rounded px-2 py-1.5 bg-background" />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Estimated Days</label>
                        <input type="number" min={0} value={logDays} onChange={(e) => setLogDays(parseInt(e.target.value, 10) || 0)} className="w-full text-xs border rounded px-2 py-1.5 bg-background" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Impact Note (optional)</label>
                      <input value={logImpact} onChange={(e) => setLogImpact(e.target.value)} className="w-full text-xs border rounded px-2 py-1.5 bg-background" />
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleLogInterruption} disabled={!logDesc.trim()} className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded bg-foreground text-background disabled:opacity-50">
                        Save
                      </button>
                      <button onClick={() => setLogFormExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionActivityFeed({ decisionId }: { decisionId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: activity = [], isLoading } = useDecisionActivity(decisionId);

  return (
    <div className="mt-3 pt-3 border-t">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        Activity ({activity.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 text-xs">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground/50 italic">No changes recorded</p>
          ) : (
            activity.map((a: any) => {
              const label = fieldLabels[a.field_name] ?? a.field_name;
              const oldVal = a.old_value ?? "(empty)";
              const newVal = a.new_value ?? "(empty)";
              const when = a.created_at ? relativeTime(a.created_at) : "";
              return (
                <div key={a.id}>
                  <p className="text-[10px] text-muted-foreground">{when}</p>
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">{oldVal} → {newVal}</p>
                </div>
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
  const createInterruption = useCreateInterruption();
  const { currentRole } = useOrg();
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<"strategic" | "operational">("strategic");

  const canWrite = currentRole === "admin" || currentRole === "pod_lead" || currentRole === "viewer";

  const statusOptions = ["hypothesis", "defined", "piloting", "scaling", "at_risk", "closed"] as const;
  const [pendingStatus, setPendingStatus] = useState<{ decisionId: string; newStatus: string; oldStatus: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");

  const handleStatusConfirm = () => {
    if (!pendingStatus || !statusNote.trim()) return;
    updateDecision.mutate({
      id: pendingStatus.decisionId,
      status: pendingStatus.newStatus as any,
      state_changed_at: new Date().toISOString(),
      state_change_note: statusNote.trim(),
    } as any);
    logActivity(pendingStatus.decisionId, "status", pendingStatus.oldStatus, pendingStatus.newStatus);
    setPendingStatus(null);
    setStatusNote("");
  };

  const handleInlineSave = async (id: string, field: string, oldValue: string, newValue: string) => {
    const payload: any = { id };
    if (field === "capacity_allocated" || field === "capacity_diverted") {
      const num = newValue ? Math.min(100, Math.max(0, parseInt(newValue, 10) || 0)) : 0;
      payload[field] = num;
    } else {
      payload[field] = newValue || null;
    }
    if (field === "exposure_value") payload.previous_exposure_value = oldValue || null;
    await updateDecision.mutateAsync(payload);
    qc.invalidateQueries({ queryKey: ["decision_activity", id] });
  };

  if (decisionsLoading || risksLoading) return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;

  const activeDecisions = decisions.filter((d) => d.status !== "closed");
  const activeHighImpact = activeDecisions.filter((d) => d.impact_tier === "High");
  const atCapacity = activeHighImpact.length >= 5;
  const isEmpty = decisions.length === 0;

  const totalInterrupts = decisions.reduce((s, d) => s + ((d as any).unplanned_interrupts ?? 0), 0);
  const avgCapacityDiverted = decisions.length
    ? Math.round(decisions.reduce((s, d) => s + ((d as any).capacity_diverted ?? 0), 0) / decisions.length)
    : 0;
  const decisionsAtRisk = decisions.filter((d) => ((d as any).capacity_diverted ?? 0) > 20).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">Bets</h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">
              {activeHighImpact.length}/5 Active{atCapacity ? " · At capacity" : ""}
            </span>
            <div className="flex rounded-full border border-muted-foreground/30 p-0.5">
              <button
                onClick={() => setMode("strategic")}
                className={cn(
                  "px-3 py-1 text-[10px] uppercase tracking-widest rounded-full transition-colors",
                  mode === "strategic" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Strategic
              </button>
              <button
                onClick={() => setMode("operational")}
                className={cn(
                  "px-3 py-1 text-[10px] uppercase tracking-widest rounded-full transition-colors",
                  mode === "operational" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Operational
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {decisions.length} total · {activeDecisions.length} active
          </p>
        </div>
        {canWrite && !showCreate && !atCapacity && (
          <button onClick={() => setShowCreate(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors">
            + Register Bet
          </button>
        )}
      </div>

      {mode === "operational" && (
        <div className="bg-muted/30 border rounded-lg p-4 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Operational Reality</p>
          <div className="flex justify-between text-[13px] font-mono">
            <span>Total Interrupts: {totalInterrupts}</span>
            <span>Avg Capacity Diverted: {avgCapacityDiverted}%</span>
            <span>Bets At Risk: {decisionsAtRisk}</span>
          </div>
        </div>
      )}

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

      {isEmpty && !showCreate ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No bets registered.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Register first high-impact bet to initiate constraint.</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground/50">
            <span>Hard cap: 5</span><span>10-day slice rule</span><span>Outcome required</span><span>Owner required</span>
          </div>
        </div>
      ) : (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">All Bets ({decisions.length})</h2>
          <div className="space-y-2">
            {decisions.map((d) => {
              const isActive = d.status !== "closed";

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
                      const showNudge = s.isAmber || s.isRed;
                      return (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-[10px] flex items-center gap-1.5", s.textClass, s.pulse && "font-semibold")}>
                            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", s.dotClass, s.pulse && "animate-pulse")} />
                            {s.label}
                          </span>
                          {showNudge && (
                            <a
                              href={nudgeMailto(d.title ?? "Untitled", s.days, d.owner ?? "", d.exposure_value ?? d.revenue_at_risk ?? "—")}
                              className={cn(
                                "text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded transition-colors",
                                s.isRed ? "border-signal-red text-signal-red hover:bg-signal-red/10" : "border-signal-amber text-signal-amber hover:bg-signal-amber/10"
                              )}
                            >
                              Nudge
                            </a>
                          )}
                        </div>
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

                  {canWrite && (
                    <div className="mb-3">
                      <span className="text-muted-foreground text-xs">Status</span>
                      <div className="mt-0.5">
                        <select
                          value={pendingStatus?.decisionId === d.id ? pendingStatus.newStatus : (d.status === "active" ? "piloting" : d.status)}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const oldStatus = d.status === "active" ? "piloting" : d.status;
                            if (newStatus === oldStatus) {
                              setPendingStatus(null);
                              return;
                            }
                            setPendingStatus({ decisionId: d.id, newStatus, oldStatus: d.status });
                            setStatusNote("");
                          }}
                          className="text-xs border rounded px-2 py-1 bg-background"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
                          ))}
                        </select>
                        {pendingStatus?.decisionId === d.id && (
                          <div className="mt-2 p-2 border rounded bg-muted/30">
                            <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">What changed? What&apos;s the evidence?</label>
                            <textarea
                              rows={2}
                              placeholder="Required: reason for state change"
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              className="w-full text-xs border rounded px-2 py-1.5 bg-background"
                            />
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                onClick={handleStatusConfirm}
                                disabled={!statusNote.trim()}
                                className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded bg-foreground text-background disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button onClick={() => setPendingStatus(null)} className="text-xs text-muted-foreground hover:text-foreground">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                    <div><span className="text-muted-foreground">Surface</span><p className="font-medium mt-0.5">{d.surface}</p></div>
                    <div><span className="text-muted-foreground">Outcome Target</span><div className="font-medium mt-0.5"><InlineEdit value={d.outcome_target ?? ""} field="outcome_target" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    {(d.outcome_category_key || d.outcome_category) && (
                      <div><span className="text-muted-foreground">Category</span><p className="font-medium mt-0.5">{categoryLabels[(d.outcome_category_key ?? d.outcome_category) as string] ?? (d.outcome_category_key ?? d.outcome_category)}</p></div>
                    )}
                    <div><span className="text-muted-foreground">Expected Impact</span><div className="font-medium mt-0.5"><InlineEdit value={d.expected_impact ?? ""} field="expected_impact" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                    <div><span className="text-muted-foreground">Exposure</span><div className="font-semibold mt-0.5 text-signal-amber">
                      <InlineEdit value={d.exposure_value ?? ""} field="exposure_value" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} />
                      {(() => {
                        const prev = (d as any).previous_exposure_value;
                        const curr = d.exposure_value ?? "";
                        if (!prev || prev === curr) return null;
                        const increased = String(curr).localeCompare(String(prev), undefined, { numeric: true }) > 0;
                        return (
                          <span className={cn("text-[10px] ml-1", increased ? "text-signal-red" : "text-signal-green")}>
                            {increased ? `↑ from ${prev}` : `↓ from ${prev}`}
                          </span>
                        );
                      })()}
                    </div></div>
                    <div><span className="text-muted-foreground">Current Delta</span><div className="font-semibold mt-0.5 text-signal-amber"><InlineEdit value={d.current_delta ?? ""} field="current_delta" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    <div><span className="text-muted-foreground">Enterprise Exposure</span><div className="font-semibold mt-0.5 text-signal-red"><InlineEdit value={d.revenue_at_risk ?? ""} field="revenue_at_risk" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                    <div><span className="text-muted-foreground">Owner</span><div className="font-medium mt-0.5"><InlineEdit value={d.owner ?? ""} field="owner" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} /></div></div>
                  </div>

                  {mode === "operational" && (
                    <ResourceRealitySection
                      decision={d}
                      canWrite={canWrite}
                      handleInlineSave={handleInlineSave}
                      logActivity={logActivity}
                      createInterruption={createInterruption}
                      updateDecision={updateDecision}
                      qc={qc}
                    />
                  )}

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
