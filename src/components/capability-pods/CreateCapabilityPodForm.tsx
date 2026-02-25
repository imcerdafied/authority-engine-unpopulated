import { useState } from "react";
import { useCreateCapabilityPod } from "@/hooks/useCapabilityPods";
import { useDecisions } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { CAPABILITY_POD_STATUSES, POD_STATUS_LABELS } from "@/lib/types";
import type { CapabilityPodStatus } from "@/lib/types";

interface CreateCapabilityPodFormProps {
  defaultPrimaryBetId?: string;
  onClose: () => void;
}

export default function CreateCapabilityPodForm({ defaultPrimaryBetId, onClose }: CreateCapabilityPodFormProps) {
  const createPod = useCreateCapabilityPod();
  const { data: decisions = [] } = useDecisions();
  const { currentRole } = useOrg();
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const activeBets = decisions.filter((d) => d.status !== "closed");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryBetId, setPrimaryBetId] = useState(defaultPrimaryBetId ?? "");
  const [secondaryBetId, setSecondaryBetId] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<CapabilityPodStatus>("proposed");
  const [deliverable, setDeliverable] = useState("");

  if (!canWrite) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !primaryBetId || !owner) return;

    await createPod.mutateAsync({
      name,
      description: description || null,
      primary_bet_id: primaryBetId,
      secondary_bet_id: secondaryBetId || null,
      owner,
      status,
      deliverable: deliverable || null,
    });
    toast.success(`Pod "${name}" registered`);
    onClose();
  };

  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1";
  const inputClass = "w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div className="border rounded-md p-4 mb-3 bg-surface-elevated">
      <div className="flex items-center justify-between mb-3">
        <h3 className={labelClass}>Register Capability Pod</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Owner *</label>
            <input required value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Primary Bet *</label>
            <select
              required
              value={primaryBetId}
              onChange={(e) => {
                setPrimaryBetId(e.target.value);
                if (secondaryBetId === e.target.value) setSecondaryBetId("");
              }}
              className={inputClass}
            >
              <option value="" disabled>Select bet…</option>
              {activeBets.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Secondary Bet</label>
            <select
              value={secondaryBetId}
              onChange={(e) => setSecondaryBetId(e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {activeBets
                .filter((b) => b.id !== primaryBetId)
                .map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as CapabilityPodStatus)} className={inputClass}>
              {CAPABILITY_POD_STATUSES.map((s) => (
                <option key={s} value={s}>{POD_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Deliverable</label>
            <input value={deliverable} onChange={(e) => setDeliverable(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass + " resize-y"}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={createPod.isPending || !name || !primaryBetId || !owner}
            className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {createPod.isPending ? "Registering…" : "Register Pod"}
          </button>
        </div>
      </form>
    </div>
  );
}
