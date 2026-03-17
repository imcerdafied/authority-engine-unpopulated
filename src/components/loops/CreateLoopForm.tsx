import { useState } from "react";
import { useCreateLoop } from "@/hooks/useOutcomeLoops";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers, type OrgMember } from "@/hooks/useTeam";
import { toast } from "sonner";

interface CreateLoopFormProps {
  betId: string;
  onClose: () => void;
}

export default function CreateLoopForm({ betId, onClose }: CreateLoopFormProps) {
  const createLoop = useCreateLoop();
  const { user } = useAuth();
  const { data: members = [] } = useOrgMembers();

  const [title, setTitle] = useState("");
  const [useCase, setUseCase] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [ownerUserId, setOwnerUserId] = useState(user?.id ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !useCase.trim() || !ownerUserId) return;

    try {
      await createLoop.mutateAsync({
        bet_id: betId,
        title: title.trim(),
        use_case: useCase.trim(),
        hypothesis: hypothesis.trim() || undefined,
        owner_user_id: ownerUserId,
      });
      toast.success(`Loop created — "${title.trim()}"`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create loop");
    }
  };

  const labelFor = (m: OrgMember) => m.display_name || m.email || "Unknown";

  return (
    <div className="border rounded-md p-4 bg-surface-elevated">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          New Outcome Loop
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            Title *
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Self-serve onboarding v2"
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            Use Case *
          </label>
          <textarea
            required
            rows={2}
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="What specific problem or opportunity does this loop address?"
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            Hypothesis
          </label>
          <textarea
            rows={2}
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="If we build X, we expect Y because Z"
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            Owner *
          </label>
          <select
            required
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="" disabled>
              Select owner...
            </option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {labelFor(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={createLoop.isPending || !title.trim() || !useCase.trim() || !ownerUserId}
            className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {createLoop.isPending ? "Creating..." : "Create Loop"}
          </button>
        </div>
      </form>
    </div>
  );
}
