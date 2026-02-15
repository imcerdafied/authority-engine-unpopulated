import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", path: "/" },
  { label: "Decisions", path: "/decisions" },
  { label: "Signals", path: "/signals" },
  { label: "Pods", path: "/pods" },
  { label: "Memory", path: "/memory" },
  { label: "Ask", path: "/ask" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

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
        </div>
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
          <p className="text-[11px] text-sidebar-muted uppercase tracking-wider">
            Operating Layer v1
          </p>
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
