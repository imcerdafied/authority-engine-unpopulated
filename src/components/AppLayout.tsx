import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";

const navItems = [
  { label: "Overview", path: "/" },
  { label: "Decisions", path: "/decisions" },
  { label: "Signals", path: "/signals" },
  { label: "Pods", path: "/pods" },
  { label: "Memory", path: "/memory" },
  { label: "Ask", path: "/ask" },
];

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pod_lead: "Pod Lead",
  viewer: "Viewer",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentOrg, currentRole, memberships, setCurrentOrgId } = useOrg();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="px-5 py-6">
          <h1 className="text-sm font-bold tracking-widest uppercase text-sidebar-primary">
            Build
          </h1>
          <h1 className="text-sm font-bold tracking-widest uppercase text-sidebar-primary">
            Authority
          </h1>
          {currentOrg?.name ? (
            <p className="text-[10px] uppercase tracking-widest text-sidebar-muted mt-1">
              {currentOrg.name}
            </p>
          ) : (
            <p className="text-[10px] uppercase tracking-widest text-sidebar-muted mt-1">
              Select Organization
            </p>
          )}
        </div>

        {/* Org selector */}
        {memberships.length > 1 && (
          <div className="px-3 mb-2">
            <select
              value={currentOrg?.id || ""}
              onChange={(e) => setCurrentOrgId(e.target.value)}
              className="w-full bg-sidebar-accent text-sidebar-accent-foreground text-[11px] rounded-sm px-2 py-1.5 border border-sidebar-border focus:outline-none"
            >
              {memberships.map((m) => (
                <option key={m.org_id} value={m.org_id}>
                  {m.organization.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "block px-3 py-2 text-[13px] font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-muted uppercase tracking-wider">
            S1 · Video Insights
          </p>
          <p className="text-[10px] text-sidebar-muted uppercase tracking-wider">
            S2 · DPI Intelligence
          </p>
          <p className="text-[10px] text-sidebar-muted uppercase tracking-wider">
            S3 · Agent Outcomes
          </p>
        </div>

        {/* User info */}
        <div className="px-5 py-3 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-muted truncate">
            {user?.email}
          </p>
          {currentRole && (
            <p className="text-[10px] text-sidebar-muted font-semibold uppercase tracking-wider mt-0.5">
              {roleLabels[currentRole] || currentRole}
            </p>
          )}
          <button
            onClick={signOut}
            className="text-[10px] text-sidebar-muted hover:text-sidebar-primary mt-1 uppercase tracking-wider transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
