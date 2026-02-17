import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers } from "@/hooks/useTeam";
import { useInvitations, useCreateInvitation, useDeleteInvitation } from "@/hooks/useInvitations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pod_lead: "Pod Lead",
  viewer: "Viewer",
};

const roleOptions = ["viewer", "pod_lead", "admin"] as const;

export default function Team() {
  const { user } = useAuth();
  const { currentOrg, currentRole } = useOrg();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const { data: invitations = [], isLoading: invitesLoading } = useInvitations();
  const createInvitation = useCreateInvitation();
  const deleteInvitation = useDeleteInvitation();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("viewer");

  const isAdmin = currentRole === "admin";
  const isLoading = membersLoading || invitesLoading;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      await createInvitation.mutateAsync({ email: email.trim(), role });
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
      setRole("viewer");
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("This email has already been invited.");
      } else {
        toast.error("Failed to send invitation.");
      }
    }
  };

  const handleRevoke = async (id: string, invEmail: string) => {
    try {
      await deleteInvitation.mutateAsync(id);
      toast.success(`Invitation to ${invEmail} revoked.`);
    } catch {
      toast.error("Failed to revoke invitation.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} member{members.length !== 1 ? "s" : ""} · {invitations.length} pending
        </p>
      </div>

      {/* Invite Teammate */}
      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invite Teammate</h2>
          <div className="border rounded-md p-4">
            <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-64 border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={createInvitation.isPending}
                className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {createInvitation.isPending ? "Sending..." : "Send Invite"}
              </button>
            </form>
          </div>
        </section>
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
                  <p className="text-sm font-medium">
                    {m.user_id === user?.id ? `You (${roleLabels[m.role] || m.role})` : "Member"}
                  </p>
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
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Pending Invitations ({invitations.length})
        </h2>
        {invitations.length === 0 ? (
          <div className="border border-dashed rounded-md px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {roleLabels[inv.role] || inv.role}
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
        )}
      </section>
    </div>
  );
}
