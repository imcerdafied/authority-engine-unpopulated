import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDecisions, useUpdateDecision, useDecisionRisks } from "@/hooks/useOrgData";
import { useLogActivity, useDecisionActivity } from "@/hooks/useDecisionActivity";
import { useInterruptions, useCreateInterruption } from "@/hooks/useInterruptions";
import { useOrgMembers, type OrgMember } from "@/hooks/useTeam";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import TagPill from "@/components/bets/TagPill";
import SectionBlock from "@/components/bets/SectionBlock";
import ExposureCallout from "@/components/bets/ExposureCallout";
import MetaFieldGrid, { MetaField } from "@/components/bets/MetaFieldGrid";
import BetCapabilityPodsSection from "@/components/capability-pods/BetCapabilityPodsSection";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PodConfig {
  pod_name: string;
  pod_type: string;
  mandate: string;
  composition: { role: string; count: number; note: string }[];
  total_headcount: number;
  financial_accountability?: {
    revenue_unlocked?: string | null;
    revenue_defended?: string | null;
    cost_reduced?: string | null;
    renewal_risk_mitigated?: string | null;
  };
  dependencies?: string[];
  sizing_rationale?: string;
}

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
  displayTransform,
  multiline,
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
  displayTransform?: (v: string) => string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const titleAsMultiline = multiline || variant === "title";

  useEffect(() => {
    if (editing) {
      setEditValue(value);
      inputRef.current?.focus();
    }
  }, [editing, value]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    const normalized = field === "title" ? trimmed.replace(/\s+/g, " ") : trimmed;
    const oldVal = (value ?? "").trim();
    const normalizedOld = field === "title" ? oldVal.replace(/\s+/g, " ") : oldVal;
    if (normalized !== normalizedOld) {
      await onSave(decisionId, field, normalizedOld || "", normalized);
      logActivity?.(decisionId, field, normalizedOld || null, normalized || null)?.catch(() => {});
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (titleAsMultiline) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        setEditValue(value);
        setEditing(false);
      }
    } else {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        setEditValue(value);
        setEditing(false);
      }
    }
  };

  const normalizedValue = field === "title" ? (value || "").replace(/\s+/g, " ").trim() : value;
  const displayValue = displayTransform ? (normalizedValue ? displayTransform(normalizedValue) : "") : normalizedValue;
  const display = displayValue || placeholder;
  const isEmpty = !value;

  if (!canEdit) {
    return (
      <span className={cn(isEmpty && "text-muted-foreground/50 italic", titleAsMultiline && "whitespace-pre-wrap", className)}>
        {display}
      </span>
    );
  }

  if (editing) {
    if (titleAsMultiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          rows={variant === "title" ? 3 : 4}
          className={cn(
            "border rounded bg-background text-foreground w-full text-sm px-2 py-1 resize-y",
            variant === "title" && "bg-white text-black text-lg font-semibold leading-snug min-h-[84px]"
          )}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        min={inputType === "number" ? 0 : undefined}
        max={inputType === "number" ? 100 : undefined}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "border rounded bg-background text-foreground w-full text-sm px-1 py-0.5",
          variant === "title" && "font-semibold bg-white text-black"
        )}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 min-h-[1.5em] inline-block",
        variant === "title" && "font-semibold",
        isEmpty && "text-muted-foreground/50 italic",
        titleAsMultiline && "whitespace-pre-wrap",
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
  platform_integrity: "Platform Integrity",
};

const solutionDomainOptions = ["S1", "S2", "S3"] as const;
const solutionDomainLabels: Record<string, string> = {
  S1: "Video",
  S2: "DPI",
  S3: "Agent Intelligence",
  Cross: "Cross-Solution",
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

function isDecisionOwner(decision: any, user: any): boolean {
  if (!user) return false;
  if (decision?.owner_user_id) return decision.owner_user_id === user.id;
  return false;
}

function LogInterruptionForm({
  decision: d,
  canWrite,
  createInterruption,
  updateDecision,
  qc,
  onClose,
}: {
  decision: any;
  canWrite: boolean;
  createInterruption: ReturnType<typeof useCreateInterruption>;
  updateDecision: ReturnType<typeof useUpdateDecision>;
  qc: ReturnType<typeof useQueryClient>;
  onClose: () => void;
}) {
  const [logDesc, setLogDesc] = useState("");
  const [logSource, setLogSource] = useState("ad_hoc");
  const [logDays, setLogDays] = useState(0);
  const [logImpact, setLogImpact] = useState("");

  const capacityDiverted = (d.capacity_diverted ?? 0) as number;
  const unplannedInterrupts = (d.unplanned_interrupts ?? 0) as number;
  const escalationCount = (d.escalation_count ?? 0) as number;

  const handleLogInterruption = async () => {
    if (!logDesc.trim()) return;
    try {
      await createInterruption.mutateAsync({
        decision_id: d.id,
        description: logDesc.trim(),
        source: logSource,
        engineers_diverted: 0,
        estimated_days: logDays,
        impact_note: logImpact.trim() || undefined,
      });
      await updateDecision.mutateAsync({
        id: d.id,
        unplanned_interrupts: unplannedInterrupts + 1,
        escalation_count: logSource === "escalation" ? escalationCount + 1 : escalationCount,
        capacity_diverted: capacityDiverted,
      } as any);
      qc.invalidateQueries({ queryKey: ["decisions"] });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!canWrite) return null;

  return (
    <div className="mt-2 p-3 border rounded bg-muted/30 space-y-2">
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
        <input
          value={logDesc}
          onChange={(e) => setLogDesc(e.target.value)}
          placeholder="What happened?"
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
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Estimated Days</label>
          <input type="number" min={0} value={logDays || ""} onChange={(e) => setLogDays(parseInt(e.target.value, 10) || 0)} placeholder="0" className="w-full text-xs border rounded px-2 py-1.5 bg-background" />
        </div>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Impact Note (optional)</label>
        <input value={logImpact} onChange={(e) => setLogImpact(e.target.value)} placeholder="What does this cost?" className="w-full text-xs border rounded px-2 py-1.5 bg-background" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleLogInterruption} disabled={!logDesc.trim()} className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded bg-foreground text-background disabled:opacity-50">
          Save
        </button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

function ResourceRealitySection({
  decision: d,
  canWrite,
  handleInlineSave,
  logActivity,
  createInterruption,
  updateDecision,
  qc,
  logFormExpanded,
  setLogFormExpanded,
}: {
  decision: any;
  canWrite: boolean;
  handleInlineSave: (id: string, field: string, oldValue: string, newValue: string) => Promise<void>;
  logActivity: (decisionId: string, field: string, oldValue: string | null, newValue: string | null) => void | Promise<void>;
  createInterruption: ReturnType<typeof useCreateInterruption>;
  updateDecision: ReturnType<typeof useUpdateDecision>;
  qc: ReturnType<typeof useQueryClient>;
  logFormExpanded: boolean;
  setLogFormExpanded: (v: boolean) => void;
}) {
  const [interruptExpanded, setInterruptExpanded] = useState(false);

  const { data: interruptions = [] } = useInterruptions(d.id);
  const capacityAllocated = (d.capacity_allocated ?? 0) as number;
  const capacityDiverted = (d.capacity_diverted ?? 0) as number;
  const unplannedInterrupts = (d.unplanned_interrupts ?? 0) as number;
  const escalationCount = (d.escalation_count ?? 0) as number;
  const netCapacity = Math.max(0, capacityAllocated - capacityDiverted);

  const hasContent = capacityDiverted > 0 || unplannedInterrupts > 0;
  if (!hasContent) return null;

  const netCapacityClass =
    netCapacity > 60 ? "text-signal-green" : netCapacity > 30 ? "text-signal-amber" : "text-signal-red";

  const grayPct = Math.max(0, 100 - capacityAllocated - capacityDiverted);

  const wrapperClass =
    capacityDiverted > 20
      ? "border-l-4 border-signal-red bg-signal-red/5 p-3 rounded-r-md"
      : capacityDiverted >= 1
      ? "border-l-4 border-signal-amber bg-signal-amber/5 p-3 rounded-r-md"
      : "border-l-4 border-muted bg-muted/20 p-3 rounded-r-md";

  return (
    <div className={cn("mt-3 space-y-3", wrapperClass)}>
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
                  <p className="text-muted-foreground text-[10px]">{i.estimated_days} days</p>
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
                  <LogInterruptionForm
                    decision={d}
                    canWrite={canWrite}
                    createInterruption={createInterruption}
                    updateDecision={updateDecision}
                    qc={qc}
                    onClose={() => setLogFormExpanded(false)}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionActivityFeed({
  decisionId,
  logInterruptionOnClick,
  canWrite,
}: {
  decisionId: string;
  logInterruptionOnClick?: () => void;
  canWrite?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: activity = [], isLoading } = useDecisionActivity(decisionId);

  return (
    <div className="mt-3 pt-3 pb-4 px-5 md:px-6 border-t">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Activity ({activity.length})
        </button>
        {canWrite && logInterruptionOnClick && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <button
              onClick={logInterruptionOnClick}
              className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Log Interruption
            </button>
          </>
        )}
      </div>
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

function PodInlineEdit({
  value,
  onSave,
  canEdit,
  asTextarea,
  inputType = "text",
  className,
  placeholder,
  inputClassName,
}: {
  value: string;
  onSave: (v: string) => void;
  canEdit: boolean;
  asTextarea?: boolean;
  inputType?: "text" | "number";
  className?: string;
  placeholder?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(value);
      inputRef.current?.focus();
    }
  }, [editing, value]);

  const handleSave = () => {
    const trimmed = asTextarea ? editValue.trim() : editValue.trim();
    if (trimmed !== (value ?? "").trim()) {
      onSave(inputType === "number" ? String(Math.max(1, parseInt(editValue, 10) || 1)) : trimmed);
    }
    setEditing(false);
  };

  if (!canEdit) {
    return <span className={cn(className, !value && "text-muted-foreground/50 italic")}>{value || (placeholder ?? "—")}</span>;
  }

  if (editing) {
    if (asTextarea) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          className={cn("w-full text-sm border rounded px-2 py-1 bg-background", className)}
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        min={inputType === "number" ? 1 : undefined}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className={cn(
          inputType === "number"
            ? "w-12 text-center text-sm border rounded px-1 py-0.5 bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            : "w-full text-sm border rounded px-2 py-1 bg-background",
          inputClassName ?? className
        )}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 inline-block min-h-[1.5em]",
        asTextarea && "block whitespace-pre-wrap",
        !value && "text-muted-foreground/50 italic",
        className
      )}
    >
      {value || (placeholder ?? "—")}
    </span>
  );
}

function PodConfigurationSection({
  pod: initialPod,
  expanded,
  onToggle,
  justGenerated,
  decisionId,
  canWrite,
  onSave,
}: {
  pod: PodConfig;
  expanded: boolean;
  onToggle: () => void;
  justGenerated: boolean;
  decisionId: string;
  canWrite: boolean;
  onSave: (updated: PodConfig) => Promise<void>;
}) {
  const [pod, setPod] = useState<PodConfig>(() => ({ ...initialPod, composition: [...(initialPod.composition ?? [])] }));
  useEffect(() => {
    setPod({ ...initialPod, composition: [...(initialPod.composition ?? [])] });
  }, [decisionId, initialPod]);

  const savePod = async (updated: PodConfig) => {
    const total = (updated.composition ?? []).reduce((s, c) => s + (c.count || 1), 0);
    const toSave = { ...updated, total_headcount: total };
    setPod(toSave);
    await onSave(toSave);
  };

  const updateComposition = (i: number, patch: Partial<{ role: string; count: number; note: string }>) => {
    const comp = [...(pod.composition ?? [])];
    comp[i] = { ...comp[i], ...patch };
    savePod({ ...pod, composition: comp });
  };

  const removeRole = (i: number) => {
    const comp = (pod.composition ?? []).filter((_, j) => j !== i);
    savePod({ ...pod, composition: comp });
  };

  const addRole = () => {
    const comp = [...(pod.composition ?? []), { role: "New Role", count: 1, note: "" }];
    savePod({ ...pod, composition: comp });
  };

  const updateMandate = (v: string) => savePod({ ...pod, mandate: v });
  const updateFa = (k: keyof NonNullable<PodConfig["financial_accountability"]>, v: string) => {
    const fa = { ...(pod.financial_accountability ?? {}), [k]: v || null };
    savePod({ ...pod, financial_accountability: fa });
  };

  const fa = pod.financial_accountability ?? {};
  const faKeys = ["revenue_unlocked", "revenue_defended", "cost_reduced", "renewal_risk_mitigated"] as const;
  const faLabels: Record<string, string> = {
    revenue_unlocked: "Revenue Unlocked",
    revenue_defended: "Revenue Defended",
    cost_reduced: "Cost Reduced",
    renewal_risk_mitigated: "Renewal Risk Mitigated",
  };

  return (
    <div className="mt-3 border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
          BET OUTCOME POD · {pod.pod_name} · {pod.total_headcount} people
        </span>
        <span className="text-muted-foreground text-[10px]">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t">
          <div className="flex items-center gap-2 flex-wrap pt-3">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
              OUTCOME POD CONFIGURATION
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-sm bg-muted text-foreground">
              {pod.pod_name}
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-sm bg-muted/80 text-muted-foreground">
              {pod.pod_type?.replace(/_/g, " ")}
            </span>
          </div>
          <div className="border-l-2 border-muted-foreground/20 pl-3">
            <PodInlineEdit
              value={pod.mandate ?? ""}
              onSave={updateMandate}
              canEdit={canWrite}
              asTextarea
              className="text-sm italic text-muted-foreground block w-full min-h-[4rem]"
              placeholder="Bet unit mandate..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(pod.composition ?? []).map((c, i) => (
              <div key={i} className="border rounded p-2 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <PodInlineEdit
                      value={c.role}
                      onSave={(v) => updateComposition(i, { role: v })}
                      canEdit={canWrite}
                      className="text-sm font-medium"
                    />
                    <span className="text-muted-foreground text-sm">
                      ×
                      <PodInlineEdit
                        value={String(c.count)}
                        onSave={(v) => updateComposition(i, { count: Math.max(1, parseInt(v, 10) || 1) })}
                        canEdit={canWrite}
                        inputType="number"
                        className="text-muted-foreground"
                        placeholder="1"
                      />
                    </span>
                  </div>
                  <PodInlineEdit
                    value={c.note ?? ""}
                    onSave={(v) => updateComposition(i, { note: v })}
                    canEdit={canWrite}
                    className="text-[10px] text-muted-foreground mt-0.5 block"
                    placeholder="Note…"
                  />
                </div>
                {canWrite && (
                  <button
                    onClick={() => removeRole(i)}
                    className="text-muted-foreground hover:text-signal-red text-lg p-1 shrink-0"
                    aria-label="Remove role"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {canWrite && (
            <button
              onClick={addRole}
              className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Add Role
            </button>
          )}
          <p className="text-sm font-semibold text-right">Total: {pod.total_headcount}</p>
          <div className="grid grid-cols-2 gap-2">
            {faKeys.map((k) => (
              <div key={k}>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">{faLabels[k]}</span>
                <PodInlineEdit
                  value={fa[k] ?? ""}
                  onSave={(v) => updateFa(k, v)}
                  canEdit={canWrite}
                  className="text-[12px] block"
                  placeholder="—"
                />
              </div>
            ))}
          </div>
          {(pod.dependencies?.length ?? 0) > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Dependencies: {pod.dependencies!.join(", ")}
            </p>
          )}
          {pod.sizing_rationale && (
            <p className="text-[11px] text-muted-foreground italic">{pod.sizing_rationale}</p>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySelect({
  value,
  categories,
  decisionId,
  canEdit,
  onSave,
  logActivity,
  className,
}: {
  value: string;
  categories: { key: string; label: string }[];
  decisionId: string;
  canEdit: boolean;
  onSave: (id: string, field: string, oldValue: string, newValue: string) => Promise<void>;
  logActivity?: (decisionId: string, field: string, oldValue: string | null, newValue: string | null) => void | Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const labelMap = Object.fromEntries(categories.map((c) => [c.key, c.label]));
  const displayLabel = value ? (labelMap[value] ?? categoryLabels[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())) : "";
  const isEmpty = !value;

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKey = e.target.value || "";
    if (newKey !== value) {
      await onSave(decisionId, "outcome_category_key", value || "", newKey);
      logActivity?.(decisionId, "outcome_category_key", value || null, newKey || null)?.catch(() => {});
    }
    setEditing(false);
  };

  if (!canEdit) {
    return (
      <span className={cn(isEmpty && "text-muted-foreground/50 italic", className)}>
        {displayLabel || "—"}
      </span>
    );
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={value || ""}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        className="text-sm border rounded px-2 py-1 w-full bg-background"
      >
        <option value="">—</option>
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-white/10 rounded px-1 -mx-1 min-h-[1.5em] inline-block",
        isEmpty && "text-white/50 italic",
        className
      )}
    >
      {displayLabel || "—"}
    </span>
  );
}

function OwnerAccountSelect({
  value,
  members,
  user,
  decisionId,
  canEdit,
  onSave,
  logActivity,
}: {
  value: string | null;
  members: OrgMember[];
  user: any;
  decisionId: string;
  canEdit: boolean;
  onSave: (id: string, field: string, oldValue: string, newValue: string) => Promise<void>;
  logActivity?: (decisionId: string, field: string, oldValue: string | null, newValue: string | null) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const current = value ?? "";

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const labelFor = (member: OrgMember) => {
    return member.display_name || member.email || "TBD";
  };

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value || "";
    if (next !== current) {
      await onSave(decisionId, "owner_user_id", current, next);
      logActivity?.(decisionId, "owner_user_id", current || null, next || null)?.catch(() => {});
    }
    setEditing(false);
  };

  const member = members.find((m) => m.user_id === current);
  const displayText = member ? labelFor(member) : "TBD";

  if (!canEdit) {
    return <span className={cn("text-sm text-white", !member && "text-white/50 italic")}>{displayText}</span>;
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={current}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        className="text-sm border rounded px-2 py-1 bg-background w-full"
      >
        <option value="">TBD</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {labelFor(m)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-white/10 rounded px-1 min-h-[1.5em] inline-block text-sm text-white",
        !member && "text-white/50 italic"
      )}
    >
      {displayText}
    </span>
  );
}

function PillSelect({
  value,
  options,
  field,
  decisionId,
  canEdit,
  onSave,
  logActivity,
  labelMap,
}: {
  value: string;
  options: readonly string[];
  field: "solution_domain" | "surface";
  decisionId: string;
  canEdit: boolean;
  onSave: (id: string, field: string, oldValue: string, newValue: string) => Promise<void>;
  logActivity?: (decisionId: string, field: string, oldValue: string | null, newValue: string | null) => void | Promise<void>;
  labelMap?: Record<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const currentValue = value || "";

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || "";
    if (newValue !== currentValue) {
      await onSave(decisionId, field, currentValue, newValue);
      logActivity?.(decisionId, field, currentValue || null, newValue || null)?.catch(() => {});
    }
    setEditing(false);
  };

  if (editing && canEdit) {
    return (
      <select
        ref={selectRef}
        value={currentValue}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        className="text-[11px] border border-white/40 rounded-sm px-2 py-0.5 bg-white text-black"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelMap?.[option] ?? option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={() => canEdit && setEditing(true)}
      onKeyDown={(e) => canEdit && e.key === "Enter" && setEditing(true)}
      className={cn(
        "inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm border border-white/40 bg-white/15 text-white",
        canEdit && "cursor-pointer hover:bg-white/25",
        !currentValue && "text-muted-foreground"
      )}
    >
      {(currentValue && labelMap?.[currentValue]) || currentValue || "—"}
    </span>
  );
}

function BetCard({
  d,
  index,
  canWrite,
  canUpdateStatus,
  canManageOwner,
  members,
  user,
  categories,
  handleInlineSave,
  logActivity,
  createInterruption,
  updateDecision,
  qc,
  statusOptions,
  pendingStatus,
  setPendingStatus,
  statusNote,
  setStatusNote,
  handleStatusConfirm,
  domainOptions,
  domainLabels,
}: {
  d: any;
  index: number;
  canWrite: boolean;
  canUpdateStatus: boolean;
  canManageOwner: boolean;
  members: OrgMember[];
  user: any;
  categories: { key: string; label: string }[];
  handleInlineSave: (id: string, field: string, oldValue: string, newValue: string) => Promise<void>;
  logActivity: (decisionId: string, field: string, oldValue: string | null, newValue: string | null) => void | Promise<void>;
  createInterruption: ReturnType<typeof useCreateInterruption>;
  updateDecision: ReturnType<typeof useUpdateDecision>;
  qc: ReturnType<typeof useQueryClient>;
  statusOptions: readonly string[];
  pendingStatus: { decisionId: string; newStatus: string; oldStatus: string } | null;
  setPendingStatus: (v: { decisionId: string; newStatus: string; oldStatus: string } | null) => void;
  statusNote: string;
  setStatusNote: (v: string) => void;
  handleStatusConfirm: () => void;
  domainOptions: string[];
  domainLabels: Record<string, string>;
}) {
  const [logFormExpanded, setLogFormExpanded] = useState(false);

  const capacityDiverted = (d.capacity_diverted ?? 0) as number;
  const unplannedInterrupts = (d.unplanned_interrupts ?? 0) as number;
  const hasResourceReality = capacityDiverted > 0 || unplannedInterrupts > 0;

  const isActive = d.status !== "closed";
  const statusDisplay = String(d.status ?? "").charAt(0).toUpperCase() + String(d.status ?? "").slice(1).replace("_", " ");
  const stale = staleness(d.updated_at);
  const showNudge = stale.isAmber || stale.isRed;

  return (
    <div key={d.id} className={cn("border rounded-md overflow-hidden font-sans", d.is_exceeded ? "border-signal-red/40 bg-signal-red/5" : d.is_aging ? "border-signal-amber/40" : "bg-background")}>
      {/* Header: Title + Tags + Meta */}
      <div className="px-4 md:px-5 py-3 border-b bg-black/90 text-white">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="min-w-0 w-full xl:flex-[1.2]">
            <div className="flex items-start gap-2 min-h-[44px]">
              <span className="text-lg font-semibold leading-snug !text-white/70">{index}.</span>
              <InlineEdit
                value={d.title ?? ""}
                field="title"
                decisionId={d.id}
                canEdit={canWrite}
                onSave={handleInlineSave}
                logActivity={logActivity}
                variant="title"
                placeholder="Untitled"
                className="text-lg font-semibold leading-snug block w-full !text-white"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              {d.is_aging && <TagPill variant="warning">Aging</TagPill>}
              {d.is_unbound && <TagPill variant="warning">Unbound</TagPill>}
              {d.needs_exec_attention && <TagPill variant="danger">Exec Attention</TagPill>}
            </div>
          </div>

          <MetaFieldGrid columns={4} className="w-full xl:flex-1 xl:min-w-0">
            <MetaField label="Category">
              <CategorySelect value={(d.outcome_category_key ?? d.outcome_category) ?? ""} categories={categories} decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} className="w-full !text-white" />
            </MetaField>
            <MetaField label="Solution">
              <PillSelect
                value={d.solution_domain ?? ""}
                options={domainOptions}
                field="solution_domain"
                decisionId={d.id}
                canEdit={canWrite}
                onSave={handleInlineSave}
                logActivity={logActivity}
                labelMap={domainLabels}
              />
            </MetaField>
            <MetaField label="Owner">
              <OwnerAccountSelect
                value={d.owner_user_id ?? null}
                members={members}
                user={user}
                decisionId={d.id}
                canEdit={canManageOwner}
                onSave={handleInlineSave}
                logActivity={logActivity}
              />
            </MetaField>
            <MetaField label="Status">
              <select
                value={pendingStatus?.decisionId === d.id ? pendingStatus.newStatus : (d.status === "active" ? "piloting" : d.status)}
                disabled={!canUpdateStatus}
                onChange={(e) => {
                  if (!canUpdateStatus) return;
                  const newStatus = e.target.value;
                  const oldStatus = d.status === "active" ? "piloting" : d.status;
                  if (newStatus === oldStatus) {
                    setPendingStatus(null);
                    return;
                  }
                  setPendingStatus({ decisionId: d.id, newStatus, oldStatus: d.status });
                  setStatusNote("");
                }}
                className={cn(
                  "text-sm border border-white/40 rounded-sm px-2 py-1.5 bg-white text-black w-full",
                  !canUpdateStatus && "opacity-60 cursor-not-allowed"
                )}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
                ))}
              </select>
            </MetaField>
          </MetaFieldGrid>
        </div>

        {pendingStatus?.decisionId === d.id && (
          <div className="mt-3 p-3 border border-white/20 rounded-sm max-w-xl">
            <label className="text-[11px] uppercase tracking-wider text-white/60 block mb-1">What changed? What&apos;s the evidence?</label>
            <textarea
              rows={2}
              placeholder="Required: reason for state change"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="w-full text-xs border rounded-sm px-2 py-1.5 bg-background text-foreground"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={handleStatusConfirm}
                disabled={!statusNote.trim()}
                className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-sm bg-white text-black disabled:opacity-50"
              >
                Confirm
              </button>
              <button onClick={() => setPendingStatus(null)} className="text-xs text-white/60 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trigger Signal */}
      <div className="px-4 md:px-5 py-4 border-b">
        <SectionBlock label="Trigger Signal">
          <InlineEdit
            value={d.trigger_signal ?? ""}
            field="trigger_signal"
            decisionId={d.id}
            canEdit={canWrite}
            onSave={handleInlineSave}
            logActivity={logActivity}
            className="text-sm font-medium leading-snug block"
            placeholder="Add trigger signal..."
            multiline
          />
        </SectionBlock>
      </div>

      {/* Body: Outcome Target, Expected Impact, Exposure */}
      <div className="px-4 md:px-5 py-4 space-y-4">
        <SectionBlock label="Outcome Target">
          <div className="rounded-md border bg-muted/15 p-3">
            <InlineEdit value={d.outcome_target ?? ""} field="outcome_target" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} className="text-sm font-medium leading-relaxed block" multiline />
          </div>
        </SectionBlock>

        <SectionBlock label="Expected Impact" collapsible defaultOpen={false}>
          <InlineEdit value={d.expected_impact ?? ""} field="expected_impact" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} className="text-sm leading-relaxed block" multiline />
        </SectionBlock>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ExposureCallout label="Upside Exposure" variant="upside">
            <InlineEdit value={d.exposure_value ?? ""} field="exposure_value" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} className="text-sm font-medium leading-relaxed block" multiline />
          </ExposureCallout>
          <ExposureCallout label="Risk Exposure" variant="risk">
            <InlineEdit value={d.revenue_at_risk ?? ""} field="revenue_at_risk" decisionId={d.id} canEdit={canWrite} onSave={handleInlineSave} logActivity={logActivity} className="text-sm font-medium leading-relaxed block" multiline />
          </ExposureCallout>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <span className={cn("text-xs flex items-center gap-1.5", stale.textClass, stale.pulse && "font-semibold")}>
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", stale.dotClass, stale.pulse && "animate-pulse")} />
            {stale.label}
          </span>
          {!canUpdateStatus && (
            <p className="text-[11px] text-muted-foreground sm:text-right">Only assigned owner or admin can update status.</p>
          )}
          {showNudge && (
            <a
              href={nudgeMailto(d.title ?? "Untitled", stale.days, d.owner ?? "", d.exposure_value ?? d.revenue_at_risk ?? "--")}
              className={cn(
                "text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-sm transition-colors",
                stale.isRed ? "border-signal-red text-signal-red hover:bg-signal-red/10" : "border-signal-amber text-signal-amber hover:bg-signal-amber/10"
              )}
            >
              Nudge
            </a>
          )}
        </div>
      </div>

      {hasResourceReality && (
        <ResourceRealitySection
          decision={d}
          canWrite={canWrite}
          handleInlineSave={handleInlineSave}
          logActivity={logActivity}
          createInterruption={createInterruption}
          updateDecision={updateDecision}
          qc={qc}
          logFormExpanded={logFormExpanded}
          setLogFormExpanded={setLogFormExpanded}
        />
      )}

      {!hasResourceReality && canWrite && logFormExpanded && (
        <div className="px-4 md:px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Log Interruption</p>
          <LogInterruptionForm
            decision={d}
            canWrite={canWrite}
            createInterruption={createInterruption}
            updateDecision={updateDecision}
            qc={qc}
            onClose={() => setLogFormExpanded(false)}
          />
        </div>
      )}

      {d.blocked_reason && (
        <div className="px-4 md:px-5 py-2 border-t text-xs">
          <p className="text-muted-foreground">Blocked: {d.blocked_reason}</p>
          {d.blocked_dependency_owner && <p className="text-muted-foreground mt-0.5">Dependency: {d.blocked_dependency_owner}</p>}
        </div>
      )}

      <BetCapabilityPodsSection
        betId={d.id}
        canWrite={canWrite}
      />

      <DecisionActivityFeed
          decisionId={d.id}
          logInterruptionOnClick={() => setLogFormExpanded(true)}
          canWrite={canWrite}
        />
    </div>
  );
}

export default function Decisions() {
  const qc = useQueryClient();
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { data: members = [] } = useOrgMembers();
  const { data: globalCategories = [] } = useQuery({
    queryKey: ["outcome_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("outcome_categories").select("key, label").order("label");
      return data || [];
    },
  });
  const { isLoading: risksLoading } = useDecisionRisks();
  const updateDecision = useUpdateDecision();
  const logActivity = useLogActivity();
  const createInterruption = useCreateInterruption();
  const { currentRole, productAreas, customOutcomeCategories } = useOrg();
  const categories = customOutcomeCategories ?? globalCategories;
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";
  const canManageOwner = currentRole === "admin" || currentRole === "pod_lead";
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDomain, setFilterDomain] = useState("");

  // Derive solution domain options from org product areas
  const orgDomainOptions = productAreas.map((pa) => pa.key);
  const orgDomainLabels: Record<string, string> = Object.fromEntries(
    productAreas.map((pa) => [pa.key, pa.label]),
  );

  const statusOptions = ["hypothesis", "defined", "piloting", "scaling", "at_risk", "closed"] as const;
  const filterStatusOptions = statusOptions.filter((s) => s !== "closed");
  const [pendingStatus, setPendingStatus] = useState<{ decisionId: string; newStatus: string; oldStatus: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());

  const handleStatusConfirm = () => {
    if (!pendingStatus || !statusNote.trim()) return;
    if (pendingStatus.newStatus === "closed") {
      setClosingIds((prev) => new Set(prev).add(pendingStatus.decisionId));
    }
    updateDecision.mutate({
      id: pendingStatus.decisionId,
      status: pendingStatus.newStatus as any,
      state_changed_at: new Date().toISOString(),
      state_change_note: statusNote.trim(),
    } as any, {
      onError: () => {
        setClosingIds((prev) => {
          const next = new Set(prev);
          next.delete(pendingStatus.decisionId);
          return next;
        });
      },
    });
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
    await updateDecision.mutateAsync(payload);
    qc.invalidateQueries({ queryKey: ["decision_activity", id] });
  };

  if (decisionsLoading || risksLoading) return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;

  const activeDecisions = decisions.filter((d) => String(d.status || "").toLowerCase() !== "closed");
  const closedCount = decisions.length - activeDecisions.length;
  const orderedDecisions = [...activeDecisions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const isEmpty = decisions.length === 0;

  const selectClass = "text-xs border rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  const filteredDecisions = orderedDecisions.filter((d) => {
    if (closingIds.has(d.id)) return false;
    if (String(d.status || "").toLowerCase() === "closed") return false;
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterDomain && d.solution_domain !== filterDomain) return false;
    return true;
  });

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Bets</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {decisions.length} total · {activeDecisions.length} open · {closedCount} closed
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="">All Statuses</option>
              {filterStatusOptions.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
              ))}
            </select>
            {orgDomainOptions.length > 0 && (
              <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className={selectClass}>
                <option value="">All Domains</option>
                {orgDomainOptions.map((d) => (
                  <option key={d} value={d}>{orgDomainLabels[d] ?? d}</option>
                ))}
              </select>
            )}
            {(filterStatus || filterDomain) && (
              <button
                onClick={() => { setFilterStatus(""); setFilterDomain(""); }}
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
            {canWrite && !showCreate && (
              <button onClick={() => setShowCreate(true)}
                className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors min-h-[44px] md:min-h-0">
                + Register Bet
              </button>
            )}
          </div>
        </div>
      </div>

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

      {isEmpty && !showCreate ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No bets registered.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">Register first high-impact bet to initiate constraint.</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground/50">
            <span>Hard cap: 10</span><span>10-day slice rule</span><span>Outcome required</span><span>Owner required</span>
          </div>
        </div>
      ) : (
        <section className="mb-8">
          <div className="space-y-5">
            {filteredDecisions.map((d, index) => (
              <BetCard
                key={d.id}
                d={d}
                index={index + 1}
                canWrite={canWrite}
                canUpdateStatus={currentRole === "admin" || isDecisionOwner(d, user)}
                canManageOwner={canManageOwner}
                members={members}
                user={user}
                categories={categories}
                handleInlineSave={handleInlineSave}
                logActivity={logActivity}
                createInterruption={createInterruption}
                updateDecision={updateDecision}
                qc={qc}
                statusOptions={statusOptions}
                pendingStatus={pendingStatus}
                setPendingStatus={setPendingStatus}
                statusNote={statusNote}
                setStatusNote={setStatusNote}
                handleStatusConfirm={handleStatusConfirm}
                domainOptions={orgDomainOptions}
                domainLabels={orgDomainLabels}
              />
            ))}
          </div>
          {filteredDecisions.length === 0 && (filterStatus || filterDomain) && (
            <p className="text-sm text-muted-foreground text-center py-8">No bets match the current filters.</p>
          )}
        </section>
      )}
    </div>
  );
}
