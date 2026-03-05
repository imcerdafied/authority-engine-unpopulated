import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  onCreateWorkspace: () => void;
}

const roleLabels: Record<string, string> = {
  admin: "admin",
  pod_lead: "editor",
  viewer: "viewer",
};

function roleChipClass(role: string) {
  if (role === "owner") return "bg-foreground/10 text-foreground";
  if (role === "admin") return "bg-muted text-foreground";
  if (role === "editor") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

export default function WorkspaceSwitcher({ onCreateWorkspace }: WorkspaceSwitcherProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { memberships, currentOrg, setCurrentOrgId } = useOrg();

  const sortedMemberships = useMemo(() => {
    return [...memberships].sort((a, b) =>
      (a.organization.name || "").localeCompare(b.organization.name || "", undefined, { sensitivity: "base" }),
    );
  }, [memberships]);

  const describeRole = (membership: (typeof memberships)[number]) => {
    if (membership.organization.created_by && membership.organization.created_by === user?.id) {
      return "owner";
    }
    return roleLabels[membership.role] || String(membership.role);
  };

  const handleSwitch = (orgId: string) => {
    if (!orgId || orgId === currentOrg?.id) return;
    setCurrentOrgId(orgId);
    void queryClient.invalidateQueries();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Switch workspace"
        >
          <span className="truncate max-w-[180px]">{currentOrg?.name ?? "Workspace"}</span>
          <span aria-hidden="true">▾</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {sortedMemberships.map((membership) => {
          const semanticRole = describeRole(membership);
          const isCurrent = membership.org_id === currentOrg?.id;
          return (
            <DropdownMenuItem
              key={membership.org_id}
              onSelect={() => handleSwitch(membership.org_id)}
              className="cursor-pointer py-2"
            >
              <div className="w-full min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm truncate", isCurrent && "font-semibold")}>
                    {membership.organization.name || "Workspace"}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0",
                      roleChipClass(semanticRole),
                    )}
                  >
                    {semanticRole}
                  </span>
                </div>
                {membership.role_label && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {membership.role_label}
                  </p>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onCreateWorkspace}
          className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider"
        >
          + New Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
