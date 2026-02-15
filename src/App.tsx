import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Overview from "@/pages/Overview";
import Decisions from "@/pages/Decisions";
import Signals from "@/pages/Signals";
import Pods from "@/pages/Pods";
import Memory from "@/pages/Memory";
import Ask from "@/pages/Ask";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
