import { useState } from "react";
import { useDecisions, useCreateDecision, useDeleteDecision, type DecisionComputed } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type SolutionDomain = Database["public"]["Enums"]["solution_domain"];
type ImpactTier = Database["public"]["Enums"]["impact_tier"];
type OutcomeCategory = Database["public"]["Enums"]["outcome_category"];

const solutionDomains: SolutionDomain[] = ["S1", "S2", "S3", "Cross"];
const impactTiers: ImpactTier[] = ["High", "Medium", "Low"];
const outcomeCategories: OutcomeCategory[] = [
  "ARR", "NRR", "DPI_Adoption", "Agent_Trust", "Live_Event_Risk", "Operational_Efficiency",
];

function CapacityMeter({ count }: { count: number }) {
  const slots = Array.from({ length: 5 }, (_, i) => i);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {slots.map((i) => (
          <div
            key={i}
            className={cn(
              "w-10 h-10 rounded-sm border-2 flex items-center justify-center text-sm font-bold transition-all duration-300",
              i < count
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground/30"
            )}
          >
            {i < count ? i + 1 : ""}
          </div>
        ))}
      </div>
      <p className={cn(
        "text-[11px] font-semibold uppercase tracking-widest",
        count >= 5 ? "text-signal-green" : "text-muted-foreground"
      )}>
        {count >= 5 ? "Authority Fully Seeded" : `${count}/5 Decisions Seeded`}
      </p>
    </div>
  );
}

function SeedingForm({ onCreated }: { onCreated: () => void }) {
  const createDecision = useCreateDecision();

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [surface, setSurface] = useState("");
  const [solutionDomain, setSolutionDomain] = useState<SolutionDomain>("S1");
  const [impactTier, setImpactTier] = useState<ImpactTier>("High");
  const [outcomeTarget, setOutcomeTarget] = useState("");
  const [outcomeCategory, setOutcomeCategory] = useState<OutcomeCategory | "">("");
  const [expectedImpact, setExpectedImpact] = useState("");
  const [exposureValue, setExposureValue] = useState("");
  const [triggerSignal, setTriggerSignal] = useState("");
  const [revenueAtRisk, setRevenueAtRisk] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !owner || !surface) return;

    try {
      await createDecision.mutateAsync({
        title,
        owner,
        surface,
        solution_domain: solutionDomain,
        impact_tier: impactTier,
        outcome_target: outcomeTarget || null,
        outcome_category: outcomeCategory || null,
        expected_impact: expectedImpact || null,
        exposure_value: exposureValue || null,
        trigger_signal: triggerSignal || null,
        revenue_at_risk: revenueAtRisk || null,
        status: "Active",
      });
      setTitle("");
      setOwner("");
      setSurface("");
      setSolutionDomain("S1");
      setImpactTier("High");
      setOutcomeTarget("");
      setOutcomeCategory("");
      setExpectedImpact("");
      setExposureValue("");
      setTriggerSignal("");
      setRevenueAtRisk("");
      onCreated();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("HIGH_IMPACT_CAP")) {
        toast.error("All 5 high-impact slots are filled.");
      } else if (msg.includes("OUTCOME_CATEGORY_REQUIRED")) {
        toast.error("Outcome Category is required to activate.");
      } else if (msg.includes("EXPECTED_IMPACT_REQUIRED")) {
        toast.error("Expected Impact is required to activate.");
      } else if (msg.includes("EXPOSURE_REQUIRED")) {
        toast.error("Exposure Value is required to activate.");
      } else if (msg.includes("OUTCOME_REQUIRED")) {
        toast.error("Outcome Target is required to activate.");
      } else if (msg.includes("OWNER_REQUIRED")) {
        toast.error("Owner is required to activate.");
      } else {
        toast.error("Failed to create decision.");
      }
    }
  };

  const inputClass = "w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground";
  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1";

  return (
    <form onSubmit={handleSubmit} className="border rounded-md p-5 bg-surface-elevated space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Decision Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fix S1 rebuffer spike" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Owner *</label>
          <input required value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Who owns the outcome" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Surface *</label>
          <input required value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="Streaming / DPI / Agent" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Domain</label>
          <select value={solutionDomain} onChange={(e) => setSolutionDomain(e.target.value as SolutionDomain)} className={inputClass}>
            {solutionDomains.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Impact Tier</label>
          <select value={impactTier} onChange={(e) => setImpactTier(e.target.value as ImpactTier)} className={inputClass}>
            {impactTiers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Outcome Target *</label>
          <input required value={outcomeTarget} onChange={(e) => setOutcomeTarget(e.target.value)} placeholder="Required to activate" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Outcome Category *</label>
          <select required value={outcomeCategory} onChange={(e) => setOutcomeCategory(e.target.value as OutcomeCategory)} className={inputClass}>
            <option value="">— Select —</option>
            {outcomeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Expected Impact *</label>
          <input required value={expectedImpact} onChange={(e) => setExpectedImpact(e.target.value)} placeholder="e.g. +15% adoption" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Exposure Value *</label>
          <input required value={exposureValue} onChange={(e) => setExposureValue(e.target.value)} placeholder="e.g. $2.1M ARR" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Trigger Signal</label>
          <input value={triggerSignal} onChange={(e) => setTriggerSignal(e.target.value)} placeholder="What prompted this" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Revenue at Risk</label>
          <input value={revenueAtRisk} onChange={(e) => setRevenueAtRisk(e.target.value)} placeholder="$4.8M ARR" className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <button type="submit" disabled={createDecision.isPending}
          className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-5 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50">
          {createDecision.isPending ? "Seeding..." : "Seed Decision"}
        </button>
      </div>
    </form>
  );
}

function SeededList({ decisions, onDelete }: { decisions: DecisionComputed[]; onDelete: (id: string) => void }) {
  if (decisions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Seeded Decisions ({decisions.length})
      </h2>
      <div className="border rounded-md divide-y">
        {decisions.map((d, i) => (
          <div key={d.id} className="px-4 py-3 flex items-center gap-4">
            <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
            <div className="flex gap-1.5 shrink-0">
              <StatusBadge status={d.solution_domain} />
              <StatusBadge status={d.impact_tier} />
              <StatusBadge status={d.status} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{d.title}</p>
              <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                <span>{d.owner}</span>
                <span>{d.surface}</span>
                {d.revenue_at_risk && <span className="text-signal-amber font-semibold">{d.revenue_at_risk}</span>}
              </div>
            </div>
            <button
              onClick={() => { if (confirm("Remove this seeded decision?")) onDelete(d.id); }}
              className="text-[11px] font-semibold uppercase tracking-wider text-signal-red hover:underline shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecSeeding({ onExit }: { onExit: () => void }) {
  const { data: decisions = [], isLoading } = useDecisions();
  const deleteDecision = useDeleteDecision();
  const { currentOrg } = useOrg();

  const highActive = decisions.filter((d) => d.impact_tier === "High" && d.status === "Active");
  const seeded = highActive.length >= 5;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {currentOrg?.name}
          </p>
          <h1 className="text-2xl font-bold mb-2">Exec Seeding Mode</h1>
          <p className="text-sm text-muted-foreground">
            Define the five high-impact decisions that anchor your authority system.
          </p>
        </div>

        {/* Capacity Meter */}
        <div className="mb-10 flex justify-center">
          <CapacityMeter count={highActive.length} />
        </div>

        {/* Form or Complete State */}
        {seeded ? (
          <div className="mb-8 border border-signal-green/40 bg-signal-green/5 rounded-md px-6 py-6 text-center">
            <p className="text-sm font-semibold text-signal-green mb-1">Authority Seeded Successfully</p>
            <p className="text-xs text-signal-green/80 mb-4">
              All 5 strategic decision slots are active. Your operating system is ready.
            </p>
            <button
              onClick={onExit}
              className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-5 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors"
            >
              Enter Build Authority →
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <SeedingForm onCreated={() => {}} />
          </div>
        )}

        {/* Seeded Decisions List */}
        <SeededList decisions={highActive} onDelete={(id) => deleteDecision.mutate(id)} />

        {/* Skip */}
        {!seeded && (
          <div className="mt-8 text-center">
            <button
              onClick={onExit}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip — enter full view with {highActive.length}/5 seeded
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
