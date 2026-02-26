import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/pages/Auth";
import { trackEvent } from "@/lib/telemetry";

const PENDING_ORG_JOIN_KEY = "pending_org_join";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TOKEN_RETRIES = 20;
const TOKEN_RETRY_DELAY_MS = 1000;
const PENDING_JOIN_TTL_MS = 1000 * 60 * 30;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function setPendingJoin(orgId: string) {
  if (typeof window === "undefined") return;
  const payload = {
    orgId,
    createdAt: Date.now(),
    expiresAt: Date.now() + PENDING_JOIN_TTL_MS,
  };
  window.localStorage.setItem(PENDING_ORG_JOIN_KEY, JSON.stringify(payload));
}

function clearOauthCodeFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code")) return;
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

function getInvokeStatus(err: unknown): number | null {
  const maybeAny = err as any;
  const status = maybeAny?.context?.status;
  return typeof status === "number" ? status : null;
}

function getInvokeMessage(err: unknown): string {
  const maybeAny = err as any;
  const msg =
    maybeAny?.message ||
    maybeAny?.context?.statusText ||
    maybeAny?.context?._statusText ||
    "";
  return String(msg).trim();
}

async function getAccessTokenOrThrow(): Promise<string> {
  const search = typeof window !== "undefined" ? window.location.search : "";
  if (search) {
    const params = new URLSearchParams(search);
    const code = params.get("code");
    if (code) {
      const markKey = `ba_oauth_code_attempted:${code}`;
      const alreadyAttempted =
        typeof window !== "undefined" && window.sessionStorage.getItem(markKey) === "1";
      if (!alreadyAttempted && typeof window !== "undefined") {
        window.sessionStorage.setItem(markKey, "1");
      }
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session?.access_token) {
        clearOauthCodeFromUrl();
        return data.session.access_token;
      }
    }
  }

  const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  if (hash) {
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      const { data } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (data.session?.access_token) return data.session.access_token;
    }
  }

  for (let i = 0; i < TOKEN_RETRIES; i++) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) return sessionData.session.access_token;

    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) return refreshed.session.access_token;

    await sleep(TOKEN_RETRY_DELAY_MS);
  }

  if (typeof window !== "undefined") {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith("sb-") || !key.includes("-auth-token")) continue;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token =
          parsed?.access_token ||
          parsed?.currentSession?.access_token ||
          parsed?.session?.access_token ||
          (Array.isArray(parsed) ? parsed[0]?.access_token : null);
        if (token && typeof token === "string") return token;
      } catch {
        // keep scanning auth-token keys
      }
    }
  }

  throw new Error("Authentication expired. Please sign in again.");
}

export default function Join() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading, refetchMemberships, setCurrentOrgId } = useOrg();
  const [joining, setJoining] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const attemptedKeyRef = useRef<string | null>(null);

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
            // First attempt via supabase invoke (may already have valid in-memory auth).
            const { data: edgeData, error: invokeError } = await supabase.functions.invoke(
              "join-org",
              { body: { orgId } },
            );
            if (!invokeError && edgeData?.success) return edgeData;
            const invokeStatus = getInvokeStatus(invokeError);
            if (invokeStatus && [400, 403, 404].includes(invokeStatus)) {
              throw new Error(friendlyError(invokeStatus, getInvokeMessage(invokeError)));
            }

            // Fallback: direct function call with explicit access token for OAuth/session hydration races.
            const accessToken = await getAccessTokenOrThrow();
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
              const msg = String(fallbackData?.error || invokeError?.message || "").trim();
              throw new Error(friendlyError(fallbackRes.status, msg));
            }
            if (!fallbackData?.success) {
              const msg = String(fallbackData?.error || invokeError?.message || "Join failed").trim();
              throw new Error(msg || "Join failed");
            }
            return fallbackData;
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
        setCurrentOrgId(orgId);
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
  }, [orgId, user, navigate, refetchMemberships, setCurrentOrgId]);

  useEffect(() => {
    if (!orgId) {
      navigate("/");
      return;
    }

    if (authLoading || orgLoading) return;
    if (!user) return;

    setPendingJoin(orgId);

    const isMember = memberships.some((m) => m.org_id === orgId);
    if (isMember) {
      localStorage.removeItem(PENDING_ORG_JOIN_KEY);
      setCurrentOrgId(orgId);
      navigate("/");
      return;
    }

    const attemptKey = `${user.id}:${orgId}`;
    if (attemptedKeyRef.current === attemptKey) return;
    attemptedKeyRef.current = attemptKey;
    joinOrg();
  }, [orgId, user, authLoading, orgLoading, memberships, navigate, joinOrg, setCurrentOrgId]);

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
