import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInviteMember,
  useOrgMembers,
  usePendingInvitations,
  useRevokeInvitation,
  useUpdateMemberRole,
} from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  pod_lead: "Editor",
  viewer: "Viewer",
};

const INVITE_BASE = "https://buildauthorityos.com/auth";

function formatDate(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleBadgeClass(role: string) {
  if (role === "owner") return "bg-foreground/10 text-foreground";
  if (role === "admin") return "bg-muted text-foreground";
  if (role === "pod_lead") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

export default function Team() {
  const { user } = useAuth();
  const { currentOrg, currentRole } = useOrg();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const { data: pendingInvitations = [], isLoading: invitesLoading } = usePendingInvitations();
  const inviteMember = useInviteMember();
  const revokeInvitation = useRevokeInvitation();
  const updateMemberRole = useUpdateMemberRole();

  const [copied, setCopied] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState(currentOrg?.allowed_email_domain ?? "");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainMsg, setDomainMsg] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "pod_lead" | "viewer">("viewer");
  const [inviteRoleLabel, setInviteRoleLabel] = useState("");

  const isOwner = currentOrg?.created_by === user?.id;
  const canManageMembers = currentRole === "admin" || isOwner;
  const inviteUrl = currentOrg?.id
    ? `${INVITE_BASE}?org=${encodeURIComponent(currentOrg.id)}`
    : "";

  const orderedMembers = useMemo(() => {
    return [...members].sort(
      (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
    );
  }, [members]);

  useEffect(() => {
    setAllowedDomain(currentOrg?.allowed_email_domain ?? "");
  }, [currentOrg?.allowed_email_domain]);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      void trackEvent("invite_link_copied", {
        orgId: currentOrg?.id ?? null,
        userId: user?.id ?? null,
        metadata: { invite_url: inviteUrl },
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Unable to copy invite link.");
    }
  };

  const handleSaveDomain = async () => {
    if (!currentOrg) return;
    setDomainSaving(true);
    setDomainMsg(null);
    const normalized = allowedDomain.trim().toLowerCase();
    const { error } = await supabase
      .from("organizations")
      .update({ allowed_email_domain: normalized || null } as any)
      .eq("id", currentOrg.id);

    if (error) {
      setDomainMsg("Failed to save domain restriction.");
      setDomainSaving(false);
      return;
    }

    setDomainMsg(normalized ? `Restricted to ${normalized}` : "Domain restriction removed.");
    setDomainSaving(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    try {
      await inviteMember.mutateAsync({
        email,
        role: inviteRole,
        roleLabel: inviteRoleLabel.trim() || undefined,
      });
      toast.success("Invitation created.");
      setInviteEmail("");
      setInviteRole("viewer");
      setInviteRoleLabel("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invite failed.";
      toast.error("Could not create invitation.", { description: message });
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      await revokeInvitation.mutateAsync(id);
      toast.success("Invitation revoked.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Revoke failed.";
      toast.error("Could not revoke invitation.", { description: message });
    }
  };

  if (membersLoading || invitesLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  if (!canManageMembers) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-bold">Workspace Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Only workspace owner/admin can manage members and invitations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Workspace Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {orderedMembers.length} member{orderedMembers.length !== 1 ? "s" : ""} · {pendingInvitations.length} pending invite{pendingInvitations.length === 1 ? "" : "s"}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Invite Member
        </h2>
        <div className="border rounded-md p-4 space-y-4">
          <form onSubmit={handleInvite} className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.6fr_0.8fr_auto] gap-2 items-end">
            <div>
              <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground block mb-1">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full text-sm border rounded-sm px-3 py-2 bg-background text-foreground"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground block mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "pod_lead" | "viewer")}
                className="w-full text-sm border rounded-sm px-3 py-2 bg-background text-foreground"
              >
                <option value="admin">Admin</option>
                <option value="pod_lead">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground block mb-1">
                Role Label (Optional)
              </label>
              <input
                type="text"
                value={inviteRoleLabel}
                onChange={(e) => setInviteRoleLabel(e.target.value)}
                placeholder="Product Manager"
                className="w-full text-sm border rounded-sm px-3 py-2 bg-background text-foreground"
              />
            </div>

            <button
              type="submit"
              disabled={inviteMember.isPending}
              className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {inviteMember.isPending ? "Sending..." : "Invite"}
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="text-sm border rounded-sm px-3 py-2 bg-muted/30 text-foreground"
            />
            <button
              onClick={handleCopy}
              className="text-[11px] font-semibold uppercase tracking-wider border border-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors"
            >
              {copied ? "Copied ✓" : "Copy Invite Link"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Invite links use the active workspace id and keep data isolated per workspace.
          </p>

          <div className="pt-2 border-t">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground block mb-1">
                  Allowed Email Domain
                </label>
                <input
                  type="text"
                  value={allowedDomain}
                  onChange={(e) => setAllowedDomain(e.target.value)}
                  placeholder="e.g. conviva.com"
                  className="w-full text-sm border rounded-sm px-3 py-2 bg-background text-foreground"
                />
              </div>
              <button
                onClick={handleSaveDomain}
                disabled={domainSaving}
                className="text-[11px] font-semibold uppercase tracking-wider border border-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
              >
                {domainSaving ? "Saving..." : "Save Domain Rule"}
              </button>
            </div>
            {domainMsg && <p className="text-[11px] text-muted-foreground mt-2">{domainMsg}</p>}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Pending Invitations ({pendingInvitations.length})
        </h2>
        {pendingInvitations.length === 0 ? (
          <div className="border border-dashed rounded-md px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            {pendingInvitations.map((invite) => (
              <div key={invite.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{invite.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {roleLabels[invite.role] || invite.role}
                    {invite.role_label ? ` · ${invite.role_label}` : ""}
                    {" · "}
                    Invited {formatDate(invite.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => void handleRevokeInvite(invite.id)}
                  disabled={revokeInvitation.isPending}
                  className="text-[11px] font-semibold uppercase tracking-wider border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Members ({orderedMembers.length})
        </h2>
        {orderedMembers.length === 0 ? (
          <div className="border border-dashed rounded-md px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground">No members yet.</p>
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            {orderedMembers.map((member) => {
              const isYou = member.user_id === user?.id;
              const isWorkspaceOwner =
                !!currentOrg?.created_by && member.user_id === currentOrg.created_by;
              const semanticRole = isWorkspaceOwner ? "owner" : member.role;
              const hasName = !!member.display_name;
              const primaryText = hasName ? member.display_name : (member.email || "Unknown");
              const canEditRole = canManageMembers && !isYou && !isWorkspaceOwner;
              return (
                <div key={member.user_id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {primaryText}
                      {isYou && <span className="text-muted-foreground ml-1">(You)</span>}
                    </p>
                    {hasName && member.email && (
                      <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Joined {formatDate(member.joined_at)}
                      {member.role_label ? ` · ${member.role_label}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canEditRole ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateMemberRole.mutate(
                            {
                              userId: member.user_id,
                              role: e.target.value as "admin" | "pod_lead" | "viewer",
                            },
                            {
                              onSuccess: () => {
                                void trackEvent("member_role_updated", {
                                  orgId: currentOrg?.id ?? null,
                                  userId: user?.id ?? null,
                                  metadata: {
                                    target_user_id: member.user_id,
                                    new_role: e.target.value,
                                  },
                                });
                              },
                            },
                          )
                        }
                        disabled={updateMemberRole.isPending}
                        className="text-[11px] font-semibold uppercase tracking-wider border rounded-sm px-2 py-1 bg-background"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="pod_lead">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm",
                          roleBadgeClass(semanticRole),
                        )}
                      >
                        {roleLabels[semanticRole] || semanticRole}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
