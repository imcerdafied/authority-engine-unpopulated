import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers } from "@/hooks/useTeam";
import { cn } from "@/lib/utils";

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

  const [copied, setCopied] = useState(false);

  const isAdmin = currentRole === "admin";
  const inviteUrl = currentOrg?.id ? `${INVITE_BASE}/${currentOrg.id}` : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
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
              Share this link with your team. Anyone who signs up through it joins automatically.
            </p>
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
    </div>
  );
}
