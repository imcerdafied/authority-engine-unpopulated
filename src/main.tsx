import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import { trackEvent } from "./lib/telemetry";
import App from "./App.tsx";
import "./index.css";

// Production hardening
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;

  const reportGlobal = (msg: string, stack?: string) => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return;
    fetch(`${url}/functions/v1/error-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: msg,
        stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  };

  window.addEventListener("error", (e) => {
    void trackEvent("frontend_error", {
      severity: "error",
      metadata: { message: e.message, stack: e.error?.stack, href: window.location.href },
    });
    reportGlobal(e.message, e.error?.stack);
  });

  window.addEventListener("unhandledrejection", (e) => {
    void trackEvent("frontend_unhandled_rejection", {
      severity: "error",
      metadata: { reason: String(e.reason), stack: e.reason?.stack, href: window.location.href },
    });
    reportGlobal(String(e.reason), e.reason?.stack);
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
