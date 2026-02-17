import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import ChatAdvisor from "@/components/ChatAdvisor";
import FeedbackButton from "@/components/FeedbackButton";
import { supabase } from "@/integrations/supabase/client";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pod_lead: "Pod Lead",
  viewer: "Viewer",
};

const Sep = () => <span className="text-muted-foreground/30 mx-3 hidden md:inline">|</span>;

const navLinkClass = "text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 md:flex-initial";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentOrg, currentRole } = useOrg();

  const lastViewed = typeof window !== "undefined" ? (localStorage.getItem("feedback_last_viewed") || "1970-01-01") : "1970-01-01";
  const { data: unreadCount } = useQuery({
    queryKey: ["unread_feedback", currentOrg?.id, lastViewed],
    queryFn: async () => {
      if (!currentOrg) return 0;
      const viewed = localStorage.getItem("feedback_last_viewed") || "1970-01-01";
      const { count } = await supabase
        .from("feedback")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg.id)
        .gt("created_at", viewed);
      return count || 0;
    },
    enabled: !!currentOrg && currentRole === "admin",
    refetchInterval: 30000,
  });

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 lg:px-6 py-3">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex items-center justify-between w-full md:w-auto">
            <Link to="/" className="flex items-center gap-2.5" onClick={closeMenu}>
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
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 -mr-2 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1"
              aria-label="Toggle menu"
            >
              <span className="w-5 h-0.5 bg-foreground block" />
              <span className="w-5 h-0.5 bg-foreground block" />
              <span className="w-5 h-0.5 bg-foreground block" />
            </button>
          </div>

          <nav className={cn(
            "md:flex md:items-center md:flex-1 md:justify-between",
            menuOpen ? "flex flex-col py-2 border-b" : "hidden md:flex"
          )}>
            <div className="flex flex-col md:flex-row md:items-center">
              <Sep />
              <Link to="/" className={navLinkClass} onClick={closeMenu}>Bets</Link>
              <Sep />
              <Link to="/review" className={navLinkClass} onClick={closeMenu}>Review</Link>
              <Sep />
              <Link to="/how-it-works" className={navLinkClass} onClick={closeMenu}>How It Works</Link>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 pt-2 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0">
              <Sep />
              <Link to="/team" className={navLinkClass} onClick={closeMenu}>Team</Link>
              <Sep />
              <span className="text-[10px] text-muted-foreground truncate max-w-[180px] py-2 md:py-0">
                {user?.email}
              </span>
              {currentRole && (
                <>
                  <Sep />
                  {currentRole === "admin" ? (
                    <Link
                      to="/feedback"
                      onClick={closeMenu}
                      className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-2 md:py-0 flex items-center"
                    >
                      {roleLabels[currentRole] || currentRole}
                      {unreadCount != null && unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-signal-red inline-block ml-1" />
                      )}
                    </Link>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2 md:py-0">
                      {roleLabels[currentRole] || currentRole}
                    </span>
                  )}
                </>
              )}
              <Sep />
              <button
                onClick={() => { closeMenu(); signOut(); }}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-start md:justify-center md:min-h-0 md:min-w-0 pl-4 md:pl-0"
              >
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className={cn("flex-1 overflow-auto transition-all duration-300", chatOpen && "md:mr-96")}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full">
          {children}
        </div>
      </main>

      <ChatAdvisor chatOpen={chatOpen} setChatOpen={setChatOpen} />
      <FeedbackButton />
    </div>
  );
}
