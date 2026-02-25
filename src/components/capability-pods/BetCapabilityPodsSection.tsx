import { useState } from "react";
import { useCapabilityPodsForBet, useUpdateCapabilityPod, useLogCapabilityPodActivity } from "@/hooks/useCapabilityPods";
import PodCard from "./PodCard";
import CreateCapabilityPodForm from "./CreateCapabilityPodForm";
import PodDetailDrawer from "./PodDetailDrawer";
import type { CapabilityPod } from "@/lib/types";

interface BetCapabilityPodsSectionProps {
  betId: string;
  canWrite: boolean;
}

export default function BetCapabilityPodsSection({ betId, canWrite }: BetCapabilityPodsSectionProps) {
  const { data: pods = [] } = useCapabilityPodsForBet(betId);
  const updatePod = useUpdateCapabilityPod();
  const logActivity = useLogCapabilityPodActivity();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null);

  const primaryPods = pods.filter((p) => p.primary_bet_id === betId);
  const secondaryPods = pods.filter((p) => p.secondary_bet_id === betId && p.primary_bet_id !== betId);

  const handleToggle = (id: string, field: "prototype_built" | "customer_validated" | "production_shipped", value: boolean) => {
    const pod = pods.find((p) => p.id === id);
    if (!pod) return;
    updatePod.mutate({ id, [field]: value });
    logActivity.mutate({ podId: id, field, oldValue: String(!value), newValue: String(value) });
  };

  if (pods.length === 0 && !showCreate) {
    return (
      <div className="px-4 md:px-6 py-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Capability Pods</span>
          {canWrite && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              + Register Pod
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
          Capability Pods ({pods.length})
        </span>
        {canWrite && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            + Register Pod
          </button>
        )}
      </div>

      {showCreate && (
        <CreateCapabilityPodForm
          defaultPrimaryBetId={betId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {primaryPods.length > 0 && (
        <div className="space-y-2 mb-2">
          {primaryPods.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              betId={betId}
              canWrite={canWrite}
              onToggle={handleToggle}
              onClick={() => setSelectedPodId(pod.id)}
            />
          ))}
        </div>
      )}

      {secondaryPods.length > 0 && (
        <div className="space-y-2">
          {secondaryPods.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              betId={betId}
              canWrite={canWrite}
              onToggle={handleToggle}
              onClick={() => setSelectedPodId(pod.id)}
            />
          ))}
        </div>
      )}

      <PodDetailDrawer
        podId={selectedPodId}
        onClose={() => setSelectedPodId(null)}
        canWrite={canWrite}
      />
    </div>
  );
}
