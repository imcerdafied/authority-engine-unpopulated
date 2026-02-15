import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrgProvider, useOrg } from "@/contexts/OrgContext";
import AppLayout from "@/components/AppLayout";
import Overview from "@/pages/Overview";
import Decisions from "@/pages/Decisions";
import Signals from "@/pages/Signals";
import Pods from "@/pages/Pods";
import Memory from "@/pages/Memory";
import Ask from "@/pages/Ask";
import Auth from "@/pages/Auth";
import OrgSetup from "@/components/OrgSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading } = useOrg();

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return <Auth />;
  if (memberships.length === 0) return <OrgSetup />;

  return <>{children}</>;
}

function AppContent() {
  return (
    <AuthGate>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/pods" element={<Pods />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </AuthGate>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrgProvider>
            <AppContent />
          </OrgProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
