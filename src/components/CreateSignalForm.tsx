import { useState } from "react";
import { useCreateSignal } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import type { Database } from "@/integrations/supabase/types";

type SignalType = Database["public"]["Enums"]["signal_type"];
type SolutionDomain = Database["public"]["Enums"]["solution_domain"];

const signalTypes: SignalType[] = [
  "KPI Deviation", "Segment Variance", "Agent Drift", "Exec Escalation",
  "Launch Milestone", "Renewal Risk", "Cross-Solution Conflict",
];
const solutionDomains: SolutionDomain[] = ["S1", "S2", "S3", "Cross"];

export default function CreateSignalForm({ onClose }: { onClose: () => void }) {
  const createSignal = useCreateSignal();
  const { currentRole } = useOrg();
  const canCreate = currentRole === "admin" || currentRole === "pod_lead";

  const [type, setType] = useState<SignalType>("KPI Deviation");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [solutionDomain, setSolutionDomain] = useState<SolutionDomain | "">("");

  if (!canCreate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !source) return;

    await createSignal.mutateAsync({
      type,
      description,
      source,
      solution_domain: solutionDomain || null,
    });
    onClose();
  };

  return (
    <div className="border rounded-md p-5 mb-6 bg-surface-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Register Signal</h2>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as SignalType)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground">
              {signalTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Domain</label>
            <select value={solutionDomain} onChange={(e) => setSolutionDomain(e.target.value as SolutionDomain)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground">
              <option value="">—</option>
              {solutionDomains.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Description *</label>
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Source *</label>
          <input required value={source} onChange={(e) => setSource(e.target.value)} placeholder="Dashboard / Customer / Agent"
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={createSignal.isPending}
            className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {createSignal.isPending ? "Registering..." : "Register Signal"}
          </button>
        </div>
      </form>
    </div>
  );
}
