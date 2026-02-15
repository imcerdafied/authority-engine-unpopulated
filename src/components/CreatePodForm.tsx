import { useState } from "react";
import { useCreatePod } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import type { Database } from "@/integrations/supabase/types";

type SolutionDomain = Database["public"]["Enums"]["solution_domain"];
const solutionDomains: SolutionDomain[] = ["S1", "S2", "S3", "Cross"];

export default function CreatePodForm({ onClose }: { onClose: () => void }) {
  const createPod = useCreatePod();
  const { currentRole } = useOrg();
  const isAdmin = currentRole === "admin";

  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [solutionDomain, setSolutionDomain] = useState<SolutionDomain>("S1");

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !owner) return;
    await createPod.mutateAsync({ name, owner, solution_domain: solutionDomain });
    onClose();
  };

  return (
    <div className="border rounded-md p-5 mb-6 bg-surface-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Create Pod</h2>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Pod Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Owner *</label>
            <input required value={owner} onChange={(e) => setOwner(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Domain</label>
            <select value={solutionDomain} onChange={(e) => setSolutionDomain(e.target.value as SolutionDomain)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground">
              {solutionDomains.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={createPod.isPending}
            className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {createPod.isPending ? "Creating..." : "Create Pod"}
          </button>
        </div>
      </form>
    </div>
  );
}
