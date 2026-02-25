import { useState, useMemo } from "react";
import { useCapabilityPods } from "@/hooks/useCapabilityPods";
import { useDecisions } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import CapabilityMatrix from "@/components/capability-pods/CapabilityMatrix";
import PodDetailDrawer from "@/components/capability-pods/PodDetailDrawer";
import CreateCapabilityPodForm from "@/components/capability-pods/CreateCapabilityPodForm";
import PodImport from "@/components/capability-pods/PodImport";
import { CAPABILITY_POD_STATUSES, POD_STATUS_LABELS } from "@/lib/types";

export default function CapabilityMap() {
  const { data: pods = [], isLoading: podsLoading } = useCapabilityPods();
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { currentRole } = useOrg();

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";
  const isAdmin = currentRole === "admin";

  const [selectedPodId, setSelectedPodId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filterBet, setFilterBet] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwner, setFilterOwner] = useState("");

  const activeBets = useMemo(
    () => decisions.filter((d) => d.status !== "closed"),
    [decisions],
  );

  const owners = useMemo(
    () => [...new Set(pods.map((p) => p.owner))].sort(),
    [pods],
  );

  const filteredPods = useMemo(() => {
    let result = pods;
    if (filterBet) {
      result = result.filter(
        (p) => p.primary_bet_id === filterBet || p.secondary_bet_id === filterBet,
      );
    }
    if (filterStatus) {
      result = result.filter((p) => p.status === filterStatus);
    }
    if (filterOwner) {
      result = result.filter((p) => p.owner === filterOwner);
    }
    return result;
  }, [pods, filterBet, filterStatus, filterOwner]);

  if (podsLoading || decisionsLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading…</p>;
  }

  const selectClass = "border rounded-sm px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Capability Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pods.length} pod{pods.length !== 1 ? "s" : ""} across {activeBets.length} active bet{activeBets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && !showImport && (
            <button
              onClick={() => setShowImport(true)}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border border-muted-foreground/40 px-3 py-1.5 rounded-sm hover:border-foreground hover:text-foreground transition-colors"
            >
              Import Pods
            </button>
          )}
          {canWrite && !showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
            >
              + Register Pod
            </button>
          )}
        </div>
      </div>

      {showImport && <PodImport onClose={() => setShowImport(false)} />}
      {showCreate && <CreateCapabilityPodForm onClose={() => setShowCreate(false)} />}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filterBet} onChange={(e) => setFilterBet(e.target.value)} className={selectClass}>
          <option value="">All Bets</option>
          {activeBets.map((b) => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          {CAPABILITY_POD_STATUSES.map((s) => (
            <option key={s} value={s}>{POD_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className={selectClass}>
          <option value="">All Owners</option>
          {owners.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {(filterBet || filterStatus || filterOwner) && (
          <button
            onClick={() => { setFilterBet(""); setFilterStatus(""); setFilterOwner(""); }}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </button>
        )}
      </div>

      <CapabilityMatrix
        pods={filteredPods}
        bets={activeBets}
        onPodClick={setSelectedPodId}
      />

      <PodDetailDrawer
        podId={selectedPodId}
        onClose={() => setSelectedPodId(null)}
        canWrite={canWrite}
      />
    </div>
  );
}
