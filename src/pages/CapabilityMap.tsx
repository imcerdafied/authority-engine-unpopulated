import { useMemo, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useCapabilityPods } from "@/hooks/useCapabilityPods";
import { useDecisions } from "@/hooks/useOrgData";
import CreateCapabilityPodForm from "@/components/capability-pods/CreateCapabilityPodForm";
import CapabilityMatrix from "@/components/capability-pods/CapabilityMatrix";
import PodDetailDrawer from "@/components/capability-pods/PodDetailDrawer";
import StatusBadge from "@/components/StatusBadge";

export default function CapabilityMap() {
  const { data: pods = [], isLoading: podsLoading } = useCapabilityPods();
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { currentRole } = useOrg();
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null);

  const betTitleById = useMemo(
    () => new Map(decisions.map((d) => [d.id, d.title])),
    [decisions],
  );

  if (podsLoading || decisionsLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const totalPods = pods.length;
  const linkedPrimary = pods.filter((p) => !!p.primary_bet_id).length;
  const linkedSecondary = pods.filter((p) => !!p.secondary_bet_id).length;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="border rounded-md p-4 md:p-5 bg-background">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
              Capability Map
            </p>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
              Capability Pods
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Register capability pods and map each to one primary bet and an optional secondary bet.
            </p>
          </div>
          {canWrite && !showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors min-h-[44px]"
            >
              + Register Pod
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <div className="border rounded-sm p-2.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total Pods</p>
            <p className="text-lg font-semibold mt-1">{totalPods}</p>
          </div>
          <div className="border rounded-sm p-2.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Primary Linked</p>
            <p className="text-lg font-semibold mt-1">{linkedPrimary}</p>
          </div>
          <div className="border rounded-sm p-2.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Secondary Linked</p>
            <p className="text-lg font-semibold mt-1">{linkedSecondary}</p>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateCapabilityPodForm onClose={() => setShowCreate(false)} />
      )}

      {pods.length === 0 ? (
        <div className="border border-dashed rounded-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">Start by registering your first capability pod.</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Each capability pod must ladder to one primary bet and may optionally support one secondary bet.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <CapabilityMatrix
              pods={pods}
              bets={decisions}
              onPodClick={setSelectedPodId}
            />
          </div>

          <div className="md:hidden space-y-2">
            {pods.map((pod) => (
              <button
                key={pod.id}
                onClick={() => setSelectedPodId(pod.id)}
                className="w-full border rounded-md p-3 text-left bg-background"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold truncate">{pod.name}</p>
                  <StatusBadge status={pod.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Owner: <span className="text-foreground">{pod.owner}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Primary: <span className="text-foreground">{betTitleById.get(pod.primary_bet_id) ?? "—"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Secondary: <span className="text-foreground">{pod.secondary_bet_id ? (betTitleById.get(pod.secondary_bet_id) ?? "—") : "None"}</span>
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      <PodDetailDrawer
        podId={selectedPodId}
        onClose={() => setSelectedPodId(null)}
        canWrite={canWrite}
      />
    </div>
  );
}
