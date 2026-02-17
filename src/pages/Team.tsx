import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { usePendingInvitations, useOrgMembers, useInviteMember, useRevokeInvitation } from "@/hooks/useTeam";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pod_lead: "Pod Lead",
  viewer: "Viewer",
};

const roleOptions = ["admin", "pod_lead", "viewer"] as const;

export default function Team() {
  const { currentOrg, currentRole } = useOrg();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const { data: invitations = [], isLoading: invitesLoading } = usePendingInvitations();
  const inviteMember = useInviteMember();
  const revokeInvitation = useRevokeInvitation();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [showInvite, setShowInvite] = useState(false);

  const isAdmin = currentRole === "admin";
  const isLoading = membersLoading || invitesLoading;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      await inviteMember.mutateAsync({ email: email.trim(), role });
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
      setRole("viewer");
      setShowInvite(false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("This email has already been invited.");
      } else {
        toast.error("Failed to send invitation.");
      }
    }
  };

  const handleRevoke = async (id: string, email: string) => {
    try {
      await revokeInvitation.mutateAsync(id);
      toast.success(`Invitation to ${email} revoked.`);
    } catch {
      toast.error("Failed to revoke invitation.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""} · {invitations.length} pending
          </p>
        </div>
        {isAdmin && !showInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
          >
            + Invite Member
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="border rounded-md p-5 mb-6 bg-surface-elevated">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Invite Stakeholder
            </h2>
            <button
              onClick={() => setShowInvite(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@conviva.com"
                  className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Invited users will be added to <span className="font-semibold">{currentOrg?.name}</span> when they sign up or log in.
            </p>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={inviteMember.isPending}
                className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {inviteMember.isPending ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Members */}
      <section className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <div className="border border-dashed rounded-md px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground">No members yet.</p>
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            {members.map((m) => (
              <div key={m.user_id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{m.user_id.slice(0, 8)}…</p>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm",
                    m.role === "admin"
                      ? "bg-foreground/10 text-foreground"
                      : m.role === "pod_lead"
                      ? "bg-muted text-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {roleLabels[m.role] || m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Pending Invitations ({invitations.length})
          </h2>
          <div className="border rounded-md divide-y">
            {invitations.map((inv) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Invited {new Date(inv.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })} · {roleLabels[inv.role] || inv.role}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleRevoke(inv.id, inv.email)}
                    className="text-[11px] font-semibold uppercase tracking-wider text-signal-red hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
