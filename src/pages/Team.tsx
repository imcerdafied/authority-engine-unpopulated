import { useEffect, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers, useUpdateMemberRole } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pod_lead: "Pod Lead",
  viewer: "Viewer",
};

const INVITE_BASE = "https://buildauthorityos.com/join";

export default function Team() {
  const { user } = useAuth();
  const { currentOrg, currentRole } = useOrg();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const updateMemberRole = useUpdateMemberRole();

  const [copied, setCopied] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState(currentOrg?.allowed_email_domain ?? "");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainMsg, setDomainMsg] = useState<string | null>(null);

  const isAdmin = currentRole === "admin";
  const inviteUrl = currentOrg?.id ? `${INVITE_BASE}/${currentOrg.id}` : "";

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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  useEffect(() => {
    setAllowedDomain(currentOrg?.allowed_email_domain ?? "");
  }, [currentOrg?.allowed_email_domain]);

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
      void trackEvent("org_domain_rule_update_failed", {
        orgId: currentOrg.id,
        userId: user?.id ?? null,
        severity: "error",
        metadata: { attempted_domain: normalized, error: error.message },
      });
    } else {
      setDomainMsg(normalized ? `Restricted to ${normalized}` : "Domain restriction removed.");
      void trackEvent("org_domain_rule_updated", {
        orgId: currentOrg.id,
        userId: user?.id ?? null,
        metadata: { allowed_email_domain: normalized || null },
      });
    }
    setDomainSaving(false);
  };

  if (membersLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Invite Link */}
      {isAdmin && currentOrg && (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invite Teammate</h2>
          <div className="border rounded-md p-4">
            <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground block mb-2">
              Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 text-sm border rounded-sm px-3 py-2 bg-muted/30 text-foreground"
              />
              <button
                onClick={handleCopy}
                className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors shrink-0"
              >
                {copied ? "Copied ✓" : "Copy Link"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground italic mt-2">
              Share this link with your team. Anyone with this link can join for now.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
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
        </section>
      )}

      {/* Current Members */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <div className="border border-dashed rounded-md px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground">No members yet.</p>
          </div>
        ) : (
          <div className="border rounded-md divide-y w-full">
            {members.map((m) => (
              <div key={m.user_id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {m.user_id === user?.id
                      ? `You (${roleLabels[m.role] || m.role})`
                      : m.display_name || m.email || "Member"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {m.display_name && m.email ? m.email : (m.display_name || m.email || "No profile info")}
                  </p>
                </div>
                {isAdmin && m.user_id !== user?.id ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      updateMemberRole.mutate(
                        {
                          userId: m.user_id,
                          role: e.target.value as "admin" | "pod_lead" | "viewer",
                        },
                        {
                          onSuccess: () => {
                            void trackEvent("member_role_updated", {
                              orgId: currentOrg?.id ?? null,
                              userId: user?.id ?? null,
                              metadata: {
                                target_user_id: m.user_id,
                                new_role: e.target.value,
                              },
                            });
                          },
                        }
                      )
                    }
                    disabled={updateMemberRole.isPending}
                    className="text-[11px] font-semibold uppercase tracking-wider border rounded-sm px-2 py-1 bg-background"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="pod_lead">Pod Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
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
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
