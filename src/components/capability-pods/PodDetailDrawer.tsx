import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { useCapabilityPods, useUpdateCapabilityPod, useDeleteCapabilityPod, useCapabilityPodActivity, useLogCapabilityPodActivity } from "@/hooks/useCapabilityPods";
import { useDecisions } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { CAPABILITY_POD_STATUSES, POD_STATUS_LABELS, canSetInProduction } from "@/lib/types";
import type { CapabilityPod, CapabilityPodStatus, KpiTarget } from "@/lib/types";
import { toast } from "sonner";

interface PodDetailDrawerProps {
  podId: string | null;
  onClose: () => void;
  canWrite: boolean;
}

export default function PodDetailDrawer({ podId, onClose, canWrite }: PodDetailDrawerProps) {
  const { data: pods = [] } = useCapabilityPods();
  const { data: decisions = [] } = useDecisions();
  const { data: events = [] } = useCapabilityPodActivity(podId ?? undefined);
  const updatePod = useUpdateCapabilityPod();
  const deletePod = useDeleteCapabilityPod();
  const logActivity = useLogCapabilityPodActivity();
  const { currentRole } = useOrg();
  const isAdmin = currentRole === "admin";

  const pod = pods.find((p) => p.id === podId) ?? null;
  const activeBets = decisions.filter((d) => d.status !== "closed");

  // Local editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);

  useEffect(() => {
    if (pod) setKpiTargets(pod.kpi_targets);
  }, [pod?.id, pod?.kpi_targets.length]);

  if (!pod) {
    return (
      <Drawer open={!!podId} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent><div className="p-6 text-center text-muted-foreground text-sm">Loading…</div></DrawerContent>
      </Drawer>
    );
  }

  const betTitle = (id: string | null) => {
    if (!id) return "—";
    return decisions.find((d) => d.id === id)?.title ?? id.slice(0, 8);
  };

  const startEdit = (field: string, value: string) => {
    if (!canWrite) return;
    setEditingField(field);
    setEditValue(value);
  };

  const saveField = async (field: string, newValue: string) => {
    const oldValue = String((pod as any)[field] ?? "");
    if (newValue.trim() === oldValue.trim()) { setEditingField(null); return; }
    await updatePod.mutateAsync({ id: pod.id, [field]: newValue.trim() || null } as any);
    logActivity.mutate({ podId: pod.id, field, oldValue, newValue: newValue.trim() });
    setEditingField(null);
  };

  const handleStatusChange = async (newStatus: CapabilityPodStatus) => {
    if (newStatus === "in_production" && !canSetInProduction(pod)) {
      toast.error("Cannot set In Production: prototype must be built and customer validated first");
      return;
    }
    const old = pod.status;
    await updatePod.mutateAsync({ id: pod.id, status: newStatus });
    logActivity.mutate({ podId: pod.id, field: "status", oldValue: old, newValue: newStatus });
  };

  const handleToggle = async (field: "prototype_built" | "customer_validated" | "production_shipped", value: boolean) => {
    await updatePod.mutateAsync({ id: pod.id, [field]: value } as any);
    logActivity.mutate({ podId: pod.id, field, oldValue: String(!value), newValue: String(value) });
  };

  const handleSecondaryBetChange = async (betId: string) => {
    const val = betId || null;
    await updatePod.mutateAsync({ id: pod.id, secondary_bet_id: val });
    logActivity.mutate({ podId: pod.id, field: "secondary_bet_id", oldValue: pod.secondary_bet_id, newValue: val });
  };

  const handleDeletePod = async () => {
    if (!confirm(`Delete pod "${pod.name}"? This cannot be undone.`)) return;
    await deletePod.mutateAsync(pod.id);
    toast.success(`Pod "${pod.name}" deleted`);
    onClose();
  };

  // KPI handlers
  const addKpi = () => {
    const next = [...kpiTargets, { kpi_name: "", baseline: "", target: "", unit: "", measurement_notes: "" }];
    setKpiTargets(next);
  };

  const updateKpi = (idx: number, field: keyof KpiTarget, val: string) => {
    const next = kpiTargets.map((k, i) => (i === idx ? { ...k, [field]: val } : k));
    setKpiTargets(next);
  };

  const removeKpi = (idx: number) => {
    setKpiTargets(kpiTargets.filter((_, i) => i !== idx));
  };

  const saveKpis = async () => {
    const cleaned = kpiTargets.filter((k) => k.kpi_name.trim());
    await updatePod.mutateAsync({ id: pod.id, kpi_targets: cleaned });
    logActivity.mutate({ podId: pod.id, field: "kpi_targets", oldValue: `${pod.kpi_targets.length} targets`, newValue: `${cleaned.length} targets` });
    toast.success("KPI targets saved");
  };

  const handleDependenciesChange = async (field: "shared_primitive", value: boolean) => {
    const deps = { ...pod.dependencies, [field]: value };
    await updatePod.mutateAsync({ id: pod.id, dependencies: deps });
  };

  const handleDependencyNotesChange = async (notes: string) => {
    const deps = { ...pod.dependencies, notes };
    await updatePod.mutateAsync({ id: pod.id, dependencies: deps });
  };

  const labelClass = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground block mb-1";
  const inputClass = "w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  const EditableField = ({ field, label, value, multiline }: { field: string; label: string; value: string; multiline?: boolean }) => (
    <div>
      <span className={labelClass}>{label}</span>
      {editingField === field ? (
        multiline ? (
          <textarea
            autoFocus
            rows={3}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveField(field, editValue)}
            onKeyDown={(e) => { if (e.key === "Escape") setEditingField(null); if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveField(field, editValue); }}
            className={inputClass + " resize-y"}
          />
        ) : (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveField(field, editValue)}
            onKeyDown={(e) => { if (e.key === "Enter") saveField(field, editValue); if (e.key === "Escape") setEditingField(null); }}
            className={inputClass}
          />
        )
      ) : (
        <p
          role={canWrite ? "button" : undefined}
          tabIndex={canWrite ? 0 : undefined}
          onClick={() => startEdit(field, value)}
          onKeyDown={(e) => canWrite && e.key === "Enter" && startEdit(field, value)}
          className={cn("text-sm", canWrite && "cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 py-0.5", !value && "text-muted-foreground")}
        >
          {value || "—"}
        </p>
      )}
    </div>
  );

  return (
    <Drawer open={!!podId} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] overflow-y-auto">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DrawerTitle className="text-lg font-semibold">{pod.name}</DrawerTitle>
              <StatusBadge status={pod.status} />
            </div>
            <DrawerClose />
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-5">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <EditableField field="name" label="Name" value={pod.name} />
            <EditableField field="owner" label="Owner" value={pod.owner} />
          </div>
          <EditableField field="description" label="Description" value={pod.description ?? ""} multiline />
          <EditableField field="deliverable" label="Deliverable" value={pod.deliverable ?? ""} multiline />

          {/* Status */}
          <div>
            <span className={labelClass}>Status</span>
            {canWrite ? (
              <select
                value={pod.status}
                onChange={(e) => handleStatusChange(e.target.value as CapabilityPodStatus)}
                className={inputClass}
              >
                {CAPABILITY_POD_STATUSES.map((s) => (
                  <option
                    key={s}
                    value={s}
                    disabled={s === "in_production" && !canSetInProduction(pod)}
                  >
                    {POD_STATUS_LABELS[s]}
                    {s === "in_production" && !canSetInProduction(pod) ? " (requires prototype + validation)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <StatusBadge status={pod.status} />
            )}
          </div>

          {/* Bet alignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={labelClass}>Primary Bet</span>
              <p className="text-sm font-medium">{betTitle(pod.primary_bet_id)}</p>
            </div>
            <div>
              <span className={labelClass}>Secondary Bet</span>
              {canWrite ? (
                <select
                  value={pod.secondary_bet_id ?? ""}
                  onChange={(e) => handleSecondaryBetChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {activeBets
                    .filter((b) => b.id !== pod.primary_bet_id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                </select>
              ) : (
                <p className="text-sm">{betTitle(pod.secondary_bet_id)}</p>
              )}
            </div>
          </div>

          {/* Prototype-to-Production tracker */}
          <div>
            <span className={labelClass}>Prototype to Production</span>
            <div className="flex items-center gap-6 mt-2">
              {(["prototype_built", "customer_validated", "production_shipped"] as const).map((field, idx) => {
                const checked = pod[field];
                const labels = ["Prototype Built", "Customer Validated", "Production Shipped"];
                return (
                  <div key={field} className="flex items-center gap-2">
                    {idx > 0 && (
                      <div className={cn("w-8 h-0.5", pod[["prototype_built", "customer_validated", "production_shipped"][idx - 1] as keyof typeof pod] ? "bg-signal-green" : "bg-muted")} />
                    )}
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canWrite}
                        onChange={(e) => handleToggle(field, e.target.checked)}
                        className="h-4 w-4 rounded border-muted-foreground/50"
                      />
                      <span className={cn(checked ? "text-signal-green font-medium" : "text-muted-foreground")}>
                        {labels[idx]}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cycle time */}
          <div>
            <span className={labelClass}>Cycle Time (days)</span>
            {editingField === "cycle_time_days" ? (
              <input
                autoFocus
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  const num = editValue ? parseInt(editValue, 10) : null;
                  updatePod.mutate({ id: pod.id, cycle_time_days: num } as any);
                  setEditingField(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const num = editValue ? parseInt(editValue, 10) : null;
                    updatePod.mutate({ id: pod.id, cycle_time_days: num } as any);
                    setEditingField(null);
                  }
                  if (e.key === "Escape") setEditingField(null);
                }}
                className={inputClass + " w-32"}
              />
            ) : (
              <p
                role={canWrite ? "button" : undefined}
                onClick={() => canWrite && startEdit("cycle_time_days", String(pod.cycle_time_days ?? ""))}
                className={cn("text-sm", canWrite && "cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 py-0.5")}
              >
                {pod.cycle_time_days ? `${pod.cycle_time_days} days` : "—"}
              </p>
            )}
          </div>

          {/* KPI Targets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={labelClass}>KPI Targets</span>
              {canWrite && (
                <div className="flex gap-2">
                  {kpiTargets.length > 0 && (
                    <button onClick={saveKpis} className="text-[11px] font-semibold uppercase tracking-wider text-signal-green hover:underline">Save</button>
                  )}
                  <button onClick={addKpi} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">+ Add</button>
                </div>
              )}
            </div>
            {kpiTargets.length === 0 ? (
              <p className="text-xs text-muted-foreground">No KPI targets set</p>
            ) : (
              <div className="space-y-2">
                {kpiTargets.map((kpi, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-muted-foreground">KPI Name</label>
                      <input value={kpi.kpi_name} onChange={(e) => updateKpi(idx, "kpi_name", e.target.value)} className="w-full border rounded-sm px-2 py-1 text-xs bg-background" disabled={!canWrite} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Baseline</label>
                      <input value={kpi.baseline} onChange={(e) => updateKpi(idx, "baseline", e.target.value)} className="w-full border rounded-sm px-2 py-1 text-xs bg-background" disabled={!canWrite} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Target</label>
                      <input value={kpi.target} onChange={(e) => updateKpi(idx, "target", e.target.value)} className="w-full border rounded-sm px-2 py-1 text-xs bg-background" disabled={!canWrite} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Unit</label>
                      <input value={kpi.unit} onChange={(e) => updateKpi(idx, "unit", e.target.value)} className="w-full border rounded-sm px-2 py-1 text-xs bg-background" disabled={!canWrite} />
                    </div>
                    {canWrite && (
                      <button onClick={() => removeKpi(idx)} className="text-[11px] text-signal-red hover:underline pb-1">Remove</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div>
            <span className={labelClass}>Dependencies</span>
            <div className="space-y-2 mt-1">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={pod.dependencies.shared_primitive}
                  disabled={!canWrite}
                  onChange={(e) => handleDependenciesChange("shared_primitive", e.target.checked)}
                  className="h-3.5 w-3.5 rounded"
                />
                Shared primitive
              </label>
              {editingField === "dependency_notes" ? (
                <textarea
                  autoFocus
                  rows={2}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => { handleDependencyNotesChange(editValue); setEditingField(null); }}
                  className={inputClass + " resize-y text-xs"}
                />
              ) : (
                <p
                  role={canWrite ? "button" : undefined}
                  onClick={() => canWrite && startEdit("dependency_notes", pod.dependencies.notes)}
                  className={cn("text-xs", canWrite && "cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 py-0.5", !pod.dependencies.notes && "text-muted-foreground")}
                >
                  {pod.dependencies.notes || "No dependency notes"}
                </p>
              )}
            </div>
          </div>

          {/* Activity log */}
          <div>
            <span className={labelClass}>Activity</span>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity recorded</p>
            ) : (
              <div className="space-y-1 mt-1">
                {events.map((ev: any) => (
                  <div key={ev.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{ev.field_name}</span>
                    {ev.old_value && <> from &ldquo;{ev.old_value}&rdquo;</>}
                    {ev.new_value && <> to &ldquo;{ev.new_value}&rdquo;</>}
                    <span className="ml-2">
                      {new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          {isAdmin && (
            <div className="pt-3 border-t">
              <button
                onClick={handleDeletePod}
                className="text-[11px] font-semibold uppercase tracking-wider text-signal-red hover:underline"
              >
                Delete Pod
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
