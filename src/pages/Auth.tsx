import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PENDING_ORG_JOIN_KEY = "pending_org_join";

interface AuthProps {
  skipInviteCode?: boolean;
}

export default function Auth({ skipInviteCode }: AuthProps = {}) {
  const location = useLocation();
  const { orgId } = useParams<{ orgId?: string }>();
  const isJoinFlow = skipInviteCode || /^\/join\/[^/]+$/.test(location.pathname);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getOAuthRedirectTo = () => {
    if (isJoinFlow && orgId) return `${window.location.origin}/join/${orgId}`;
    return window.location.origin;
  };

  const handleGoogleSSO = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (isJoinFlow && orgId) {
      localStorage.setItem(PENDING_ORG_JOIN_KEY, orgId);
    }

    const workspaceDomain = import.meta.env.VITE_GOOGLE_WORKSPACE_DOMAIN as
      | string
      | undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectTo(),
        queryParams: workspaceDomain ? { hd: workspaceDomain } : undefined,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setMessage("Redirecting to Google...");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-sm font-bold tracking-widest uppercase text-foreground">
            Build Authority
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Operating Layer
          </p>
        </div>

        <div className="border rounded-md p-6">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
            Sign in with Google
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSSO}
            className="w-full text-[11px] font-semibold uppercase tracking-wider border border-foreground text-foreground px-4 py-2.5 rounded-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            Continue with Google
          </button>

          {error && (
            <p className="text-xs text-signal-red font-medium mt-3">{error}</p>
          )}
          {message && (
            <p className="text-xs text-signal-green font-medium mt-3">{message}</p>
          )}

          <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4 text-[11px]">
            <a
              href="/privacy-policy.pdf"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground underline"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-service.pdf"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground underline"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
