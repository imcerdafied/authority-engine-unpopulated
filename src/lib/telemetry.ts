import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "authority_session_id";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(SESSION_KEY, created);
  return created;
}

export async function trackEvent(eventName: string, options?: {
  orgId?: string | null;
  userId?: string | null;
  route?: string;
  severity?: "info" | "warn" | "error";
  metadata?: Record<string, unknown>;
}) {
  try {
    const sessionId = getSessionId();
    const payload = {
      event_name: eventName,
      org_id: options?.orgId ?? null,
      user_id: options?.userId ?? null,
      route: options?.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
      severity: options?.severity ?? "info",
      source: "web",
      session_id: sessionId,
      metadata: options?.metadata ?? {},
    };
    await (supabase as any).from("product_events").insert(payload);
  } catch {
    // Never block product flows on telemetry writes.
  }
}
