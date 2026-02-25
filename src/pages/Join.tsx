import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/pages/Auth";
import { trackEvent } from "@/lib/telemetry";

const PENDING_ORG_JOIN_KEY = "pending_org_join";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  onAttempt?: (attempt: number) => void,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      onAttempt?.(attempt);
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

function friendlyError(status: number, message: string): string {
  if (status === 403) return "Your email domain is not allowed for this organization.";
  if (status === 404) return "Organization not found. The invite link may be invalid.";
  if (status === 401) return "Authentication expired. Please sign in again.";
  if (status === 400) return message || "Invalid request.";
  return message || "Unable to complete invite flow.";
}

export default function Join() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading, refetchMemberships } = useOrg();
  const [joining, setJoining] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const joinOrg = useCallback(async () => {
    if (!orgId || !user) return;

    setJoining(true);
    setJoinError(null);
    setRetryAttempt(0);

    void trackEvent("invite_join_attempted", {
      userId: user.id,
      metadata: { org_id: orgId },
    });

    try {
      // Fetch org name
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();
      if (org?.name) setOrgName(org.name);

      // Ensure user profile exists
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? "",
          display_name: user.user_metadata?.full_name ?? user.email ?? null,
        },
        { onConflict: "id" },
      );

      // Attempt join with retry
      const data = await withRetry(
        async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);

          try {
            const { data: edgeData, error } = await supabase.functions.invoke(
              "join-org",
              { body: { orgId } },
            );

            if (error) {
              const message = error.message || "Join failed";
              if (message.includes("Failed to send a request to the Edge Function")) {
                // Fallback: direct HTTP call for cold-start edge functions
                const { data: sessionData } = await supabase.auth.getSession();
                const accessToken = sessionData.session?.access_token;
                if (!accessToken) throw new Error("Session expired. Please sign in again.");

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
                const fallbackRes = await fetch(
                  `${supabaseUrl}/functions/v1/join-org`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${accessToken}`,
                      apikey: supabaseAnonKey,
                    },
                    body: JSON.stringify({ orgId }),
                    signal: controller.signal,
                  },
                );
                const fallbackData = await fallbackRes.json().catch(() => ({}));
                if (!fallbackRes.ok) {
                  throw new Error(
                    friendlyError(fallbackRes.status, fallbackData?.error),
                  );
                }
                return fallbackData;
              }
              throw error;
            }
            return edgeData;
          } finally {
            clearTimeout(timeout);
          }
        },
        (attempt) => setRetryAttempt(attempt),
      );

      if (data?.success) {
        void trackEvent("invite_join_succeeded", {
          userId: user.id,
          metadata: { org_id: orgId },
        });
        localStorage.removeItem(PENDING_ORG_JOIN_KEY);
        await refetchMemberships();
        navigate("/", { replace: true });
      } else {
        throw new Error("Join failed");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to complete invite flow.";
      void trackEvent("invite_join_failed", {
        userId: user.id,
        severity: "error",
        metadata: { org_id: orgId, error: message },
      });
      setJoinError(message);
      setJoining(false);
    }
  }, [orgId, user, navigate, refetchMemberships]);

  useEffect(() => {
    if (!orgId) {
      navigate("/");
      return;
    }

    if (authLoading || orgLoading) return;
    if (!user) return;

    localStorage.setItem(PENDING_ORG_JOIN_KEY, orgId);

    const isMember = memberships.some((m) => m.org_id === orgId);
    if (isMember) {
      localStorage.removeItem(PENDING_ORG_JOIN_KEY);
      navigate("/");
      return;
    }

    joinOrg();
  }, [orgId, user, authLoading, orgLoading, memberships, navigate, joinOrg]);

  if (!orgId) return null;

  if (!authLoading && !orgLoading && !user) {
    return <Auth skipInviteCode />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-lg font-semibold">
          You&apos;ve been invited to join {orgName ?? "an organization"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {!user
            ? "Sign up to continue"
            : joining
              ? "Joining..."
              : "Ready to retry"}
        </p>
        {joining && retryAttempt > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Retry attempt {retryAttempt + 1} of {MAX_RETRIES}...
          </p>
        )}
        {joinError && (
          <div className="mt-3">
            <p className="text-xs text-signal-red">{joinError}</p>
            <button
              onClick={joinOrg}
              className="mt-2 text-[11px] font-semibold uppercase tracking-wider border border-foreground text-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
