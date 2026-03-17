import { useState } from "react";
import { cn } from "@/lib/utils";
import { LoopStatusBadge, LoopDecisionBadge } from "./LoopStatusBadge";
import SectionBlock from "@/components/bets/SectionBlock";
import {
  useUpdateLoop,
  useDeleteLoop,
  useLoopVersions,
  LOOP_STATUS_OPTIONS,
  LOOP_DECISION_OPTIONS,
  type OutcomeLoopComputed,
  type LoopStatus,
  type LoopDecision,
  type LoopVersion,
  type Contribution,
} from "@/hooks/useOutcomeLoops";
import { useOrgMembers, type OrgMember } from "@/hooks/useTeam";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LoopDetailProps {
  loop: OutcomeLoopComputed;
  onClose: () => void;
  canWrite: boolean;
}

const CONTRIBUTION_ROLES = ["owner", "design", "build", "data"] as const;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function VersionTimeline({ versions, members }: { versions: LoopVersion[]; members: OrgMember[] }) {
  if (versions.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No history yet.</p>;
  }

  const changeTypeLabel: Record<string, string> = {
    ship: "Shipped",
    learning: "Learned",
    decision: "Decided",
    status: "Status changed",
  };

  const changeTypeColor: Record<string, string> = {
    ship: "bg-signal-green",
    learning: "bg-signal-amber",
    decision: "bg-foreground",
    status: "bg-muted-foreground",
  };

  return (
    <div className="space-y-3">
      {versions.map((v) => {
        const changedBy = members.find((m) => m.user_id === v.changed_by);
        const changedByName = changedBy?.display_name || changedBy?.email || "Unknown";
        return (
          <div key={v.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", changeTypeColor[v.change_type] || "bg-muted-foreground")} />
              <div className="w-px flex-1 bg-border mt-1" />
            </div>
            <div className="pb-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {changeTypeLabel[v.change_type] || v.change_type}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  v{v.version_number} · {formatRelative(v.created_at)}
                </span>
              </div>
              {v.change_type === "ship" && v.ship_summary && (
                <p className="text-xs mt-0.5">{v.ship_summary}</p>
              )}
              {v.change_type === "learning" && v.learning && (
                <p className="text-xs mt-0.5">{v.learning}</p>
              )}
              {v.change_type === "decision" && v.decision && (
                <div className="flex items-center gap-2 mt-0.5">
                  <LoopDecisionBadge decision={v.decision} className="!text-[9px] !px-1.5 !py-0" />
                  {v.decision_notes && <span className="text-xs text-muted-foreground">{v.decision_notes}</span>}
                </div>
              )}
              {v.change_type === "status" && v.status && (
                <LoopStatusBadge status={v.status} className="!text-[9px] !px-1.5 !py-0 mt-0.5" />
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{changedByName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LoopDetail({ loop, onClose, canWrite }: LoopDetailProps) {
  const updateLoop = useUpdateLoop();
  const deleteLoop = useDeleteLoop();
  const { data: versions = [] } = useLoopVersions(loop.id);
  const { data: members = [] } = useOrgMembers();
  const { currentRole } = useOrg();
  const { user } = useAuth();

  const isOwner = user?.id === loop.owner_user_id;
  const canEdit = canWrite || isOwner;
  const canDelete = currentRole === "admin";

  // Ship form
  const [showShipForm, setShowShipForm] = useState(false);
  const [shipSummary, setShipSummary] = useState("");

  // Learn form
  const [showLearnForm, setShowLearnForm] = useState(false);
  const [learnText, setLearnText] = useState("");

  // Decision form
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionValue, setDecisionValue] = useState<LoopDecision>(loop.current_decision);
  const [decisionNotes, setDecisionNotes] = useState("");

  // Contributor form
  const [showContribForm, setShowContribForm] = useState(false);
  const [contribUserId, setContribUserId] = useState("");
  const [contribRole, setContribRole] = useState<Contribution["role"]>("build");
  const [contribNote, setContribNote] = useState("");

  const owner = members.find((m) => m.user_id === loop.owner_user_id);
  const ownerName = owner?.display_name || owner?.email || "TBD";

  const handleShip = async () => {
    if (!shipSummary.trim()) return;
    try {
      await updateLoop.mutateAsync({
        id: loop.id,
        last_ship_summary: shipSummary.trim(),
        last_ship_date: new Date().toISOString(),
      });
      toast.success("Ship logged");
      setShipSummary("");
      setShowShipForm(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log ship");
    }
  };

  const handleLearn = async () => {
    if (!learnText.trim()) return;
    try {
      await updateLoop.mutateAsync({
        id: loop.id,
        last_learning: learnText.trim(),
        last_learning_date: new Date().toISOString(),
      });
      toast.success("Learning logged");
      setLearnText("");
      setShowLearnForm(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log learning");
    }
  };

  const handleDecision = async () => {
    try {
      await updateLoop.mutateAsync({
        id: loop.id,
        current_decision: decisionValue,
        decision_notes: decisionNotes.trim() || null,
      });
      toast.success("Decision updated");
      setDecisionNotes("");
      setShowDecisionForm(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update decision");
    }
  };

  const handleStatusChange = async (newStatus: LoopStatus) => {
    try {
      await updateLoop.mutateAsync({ id: loop.id, status: newStatus });
      toast.success(`Status → ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleAddContributor = async () => {
    if (!contribUserId) return;
    const existing = loop.contributors || [];
    const updated: Contribution[] = [
      ...existing.filter((c) => c.user_id !== contribUserId),
      { user_id: contribUserId, role: contribRole, note: contribNote.trim() },
    ];
    try {
      await updateLoop.mutateAsync({ id: loop.id, contributors: updated });
      toast.success("Contributor added");
      setContribUserId("");
      setContribNote("");
      setShowContribForm(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add contributor");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this loop? This cannot be undone.")) return;
    try {
      await deleteLoop.mutateAsync(loop.id);
      toast.success("Loop deleted");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete loop");
    }
  };

  const labelFor = (m: OrgMember) => m.display_name || m.email || "Unknown";

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-5 py-3 bg-black/90 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-snug">{loop.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <LoopStatusBadge status={loop.status} />
              <LoopDecisionBadge decision={loop.current_decision} />
              <span className="text-[10px] text-white/50">v{loop.version_number}</span>
            </div>
            <p className="text-xs text-white/60 mt-1">Owner: {ownerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-white/60 hover:text-white shrink-0 pt-1"
          >
            Close
          </button>
        </div>

        {/* Status controls */}
        {canEdit && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {LOOP_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                disabled={loop.status === opt.value || updateLoop.isPending}
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm border transition-colors",
                  loop.status === opt.value
                    ? "bg-white text-black border-white"
                    : "border-white/30 text-white/60 hover:border-white hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overview */}
      <div className="px-4 md:px-5 py-4 space-y-4">
        <SectionBlock label="Use Case">
          <p className="text-sm leading-relaxed">{loop.use_case}</p>
        </SectionBlock>

        {loop.hypothesis && (
          <SectionBlock label="Hypothesis">
            <p className="text-sm leading-relaxed">{loop.hypothesis}</p>
          </SectionBlock>
        )}

        {loop.velocity_days !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Loop Velocity
            </span>
            <span className="text-sm font-semibold tabular-nums">{loop.velocity_days}d</span>
          </div>
        )}
      </div>

      {/* Latest State */}
      <div className="px-4 md:px-5 py-4 border-t space-y-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground block">
          Latest State
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Last Ship */}
          <div className="border rounded-sm p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
              Last Ship
            </span>
            {loop.last_ship_summary ? (
              <>
                <p className="text-sm">{loop.last_ship_summary}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(loop.last_ship_date)}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nothing shipped yet</p>
            )}
          </div>

          {/* Last Learning */}
          <div className="border rounded-sm p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
              Last Learning
            </span>
            {loop.last_learning ? (
              <>
                <p className="text-sm">{loop.last_learning}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(loop.last_learning_date)}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No learnings yet</p>
            )}
          </div>

          {/* Decision */}
          <div className="border rounded-sm p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
              Decision
            </span>
            <LoopDecisionBadge decision={loop.current_decision} />
            {loop.decision_notes && (
              <p className="text-xs text-muted-foreground mt-1">{loop.decision_notes}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setShowShipForm(!showShipForm); setShowLearnForm(false); setShowDecisionForm(false); }}
              className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
            >
              Log Ship
            </button>
            <button
              onClick={() => { setShowLearnForm(!showLearnForm); setShowShipForm(false); setShowDecisionForm(false); }}
              className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
            >
              Log Learning
            </button>
            <button
              onClick={() => { setShowDecisionForm(!showDecisionForm); setShowShipForm(false); setShowLearnForm(false); }}
              className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
            >
              Update Decision
            </button>
          </div>
        )}

        {/* Ship form */}
        {showShipForm && (
          <div className="border rounded-sm p-3 space-y-2">
            <textarea
              rows={2}
              value={shipSummary}
              onChange={(e) => setShipSummary(e.target.value)}
              placeholder="What did you ship?"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleShip}
                disabled={!shipSummary.trim() || updateLoop.isPending}
                className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-3 py-1.5 rounded-sm disabled:opacity-50"
              >
                {updateLoop.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowShipForm(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Learn form */}
        {showLearnForm && (
          <div className="border rounded-sm p-3 space-y-2">
            <textarea
              rows={2}
              value={learnText}
              onChange={(e) => setLearnText(e.target.value)}
              placeholder="What did you learn?"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleLearn}
                disabled={!learnText.trim() || updateLoop.isPending}
                className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-3 py-1.5 rounded-sm disabled:opacity-50"
              >
                {updateLoop.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowLearnForm(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Decision form */}
        {showDecisionForm && (
          <div className="border rounded-sm p-3 space-y-2">
            <div className="flex items-center gap-2">
              {LOOP_DECISION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDecisionValue(opt.value)}
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-sm border transition-colors",
                    decisionValue === opt.value
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:border-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Why this decision?"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecision}
                disabled={updateLoop.isPending}
                className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-3 py-1.5 rounded-sm disabled:opacity-50"
              >
                {updateLoop.isPending ? "Saving..." : "Save Decision"}
              </button>
              <button onClick={() => setShowDecisionForm(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-4 md:px-5 py-4 border-t">
        <SectionBlock label="Timeline" collapsible defaultOpen={versions.length <= 10}>
          <VersionTimeline versions={versions} members={members} />
        </SectionBlock>
      </div>

      {/* Contributors */}
      <div className="px-4 md:px-5 py-4 border-t">
        <SectionBlock label="Contributors" collapsible defaultOpen>
          <div className="space-y-2">
            {loop.contributors.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No contributors recorded.</p>
            )}
            {loop.contributors.map((c) => {
              const m = members.find((mem) => mem.user_id === c.user_id);
              return (
                <div key={c.user_id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-foreground/10 border border-foreground/20 flex items-center justify-center text-[9px] font-bold uppercase shrink-0">
                    {(m?.display_name || m?.email || "?")[0]}
                  </span>
                  <span className="font-medium">{m?.display_name || m?.email || "Unknown"}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-1.5 py-0 border rounded-sm">
                    {c.role}
                  </span>
                  {c.note && <span className="text-muted-foreground">{c.note}</span>}
                </div>
              );
            })}

            {canEdit && !showContribForm && (
              <button
                onClick={() => setShowContribForm(true)}
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                + Add Contributor
              </button>
            )}

            {showContribForm && (
              <div className="border rounded-sm p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={contribUserId}
                    onChange={(e) => setContribUserId(e.target.value)}
                    className="border rounded-sm px-2 py-1.5 text-xs bg-background"
                  >
                    <option value="">Select person...</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {labelFor(m)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={contribRole}
                    onChange={(e) => setContribRole(e.target.value as Contribution["role"])}
                    className="border rounded-sm px-2 py-1.5 text-xs bg-background"
                  >
                    {CONTRIBUTION_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full border rounded-sm px-2 py-1.5 text-xs bg-background"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddContributor}
                    disabled={!contribUserId || updateLoop.isPending}
                    className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-3 py-1 rounded-sm disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button onClick={() => setShowContribForm(false)} className="text-xs text-muted-foreground">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionBlock>
      </div>

      {/* Danger zone */}
      {canDelete && (
        <div className="px-4 md:px-5 py-3 border-t">
          <button
            onClick={handleDelete}
            disabled={deleteLoop.isPending}
            className="text-[10px] font-semibold uppercase tracking-wider text-signal-red hover:text-signal-red/80 disabled:opacity-50"
          >
            {deleteLoop.isPending ? "Deleting..." : "Delete Loop"}
          </button>
        </div>
      )}
    </div>
  );
}
