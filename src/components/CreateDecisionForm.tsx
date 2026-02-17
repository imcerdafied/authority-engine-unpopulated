import { useState, useEffect } from "react";
import { useCreateDecision } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { fetchOutcomeCategories, type OutcomeCategoryItem } from "@/lib/taxonomy";

type SolutionDomain = Database["public"]["Enums"]["solution_domain"];

const solutionDomains: SolutionDomain[] = ["S1", "S2", "S3", "Cross"];

export default function CreateDecisionForm({ onClose, navigateAfter = false }: { onClose: () => void; navigateAfter?: boolean }) {
  const createDecision = useCreateDecision();
  const { currentRole } = useOrg();
  const navigate = useNavigate();
  const canCreate = currentRole === "admin" || currentRole === "pod_lead";

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [surface, setSurface] = useState("");
  const [solutionDomain, setSolutionDomain] = useState<SolutionDomain>("S1");
  const [outcomeTarget, setOutcomeTarget] = useState("");
  const [outcomeCategories, setOutcomeCategories] = useState<OutcomeCategoryItem[]>([]);
  const [outcomeCategoryKey, setOutcomeCategoryKey] = useState("");
  const [outcomeCategoriesError, setOutcomeCategoriesError] = useState<string | null>(null);
  const [expectedImpact, setExpectedImpact] = useState("");
  const [exposureValue, setExposureValue] = useState("");

  useEffect(() => {
    fetchOutcomeCategories()
      .then(setOutcomeCategories)
      .catch((err) => {
        console.error("Failed to fetch outcome categories:", err);
        setOutcomeCategoriesError("Could not load categories");
      });
  }, []);
  const [triggerSignal, setTriggerSignal] = useState("");
  const [revenueAtRisk, setRevenueAtRisk] = useState("");

  if (!canCreate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !owner || !surface) return;
    if (!outcomeCategoryKey) return;

    await createDecision.mutateAsync({
      title,
      owner,
      surface,
      solution_domain: solutionDomain,
      impact_tier: "High",
      status: "active",
      outcome_target: outcomeTarget || null,
      outcome_category_key: outcomeCategoryKey || null,
      expected_impact: expectedImpact || null,
      exposure_value: exposureValue || null,
      trigger_signal: triggerSignal || null,
      revenue_at_risk: revenueAtRisk || null,
    } as any);
    toast.success(`Draft created — "${title}"`, {
      description: "Complete required fields to activate.",
      action: {
        label: "View decision",
        onClick: () => navigate("/decisions"),
      },
    });
    onClose();
    if (navigateAfter) {
      navigate("/decisions");
    }
  };

  return (
    <div className="border rounded-md p-5 mb-6 bg-surface-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Register High-Impact Decision</h2>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Title *</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Owner *</label>
            <input required value={owner} onChange={(e) => setOwner(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Surface *</label>
            <input required value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="Streaming / DPI / Agent"
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Outcome Target</label>
            <input value={outcomeTarget} onChange={(e) => setOutcomeTarget(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Outcome Category</label>
            <select value={outcomeCategoryKey} onChange={(e) => setOutcomeCategoryKey(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground">
              <option value="" disabled>Select…</option>
              {outcomeCategories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            {outcomeCategoriesError && (
              <p className="text-[10px] text-signal-amber mt-0.5">{outcomeCategoriesError}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Expected Impact</label>
            <input value={expectedImpact} onChange={(e) => setExpectedImpact(e.target.value)} placeholder="e.g. +15% adoption"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Exposure Value</label>
            <input value={exposureValue} onChange={(e) => setExposureValue(e.target.value)} placeholder="e.g. $2.1M ARR at risk"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Trigger Signal</label>
            <input value={triggerSignal} onChange={(e) => setTriggerSignal(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Revenue at Risk</label>
            <input value={revenueAtRisk} onChange={(e) => setRevenueAtRisk(e.target.value)} placeholder="$4.8M ARR"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={createDecision.isPending || !outcomeCategoryKey}
            className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {createDecision.isPending ? "Registering..." : "Register Decision"}
          </button>
        </div>
      </form>
    </div>
  );
}
