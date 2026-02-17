import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import logo from "@/assets/logo.png";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pod_lead: "Pod Lead",
  viewer: "Viewer",
};

const Sep = () => <span className="text-muted-foreground/30 mx-3">|</span>;

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { currentOrg, currentRole } = useOrg();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Build Authority" className="w-6 h-6" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-widest uppercase leading-tight">
                BUILD AUTHORITY
              </span>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground leading-tight">
                {currentOrg?.name ?? "Organization"}
              </span>
            </div>
          </Link>
          <Sep />
          <Link
            to="/"
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Bets
          </Link>
          <Sep />
          <Link
            to="/review"
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Review
          </Link>
          <Sep />
          <Link
            to="/how-it-works"
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/team"
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Team
          </Link>
          <Sep />
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
            {user?.email}
          </span>
          {currentRole && (
            <>
              <Sep />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {roleLabels[currentRole] || currentRole}
              </span>
            </>
          )}
          <Sep />
          <button
            onClick={signOut}
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
