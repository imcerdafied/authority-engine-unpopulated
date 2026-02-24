import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/pages/Auth";

const PENDING_ORG_JOIN_KEY = "pending_org_join";

export default function Join() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading, refetchMemberships } = useOrg();
  const [joining, setJoining] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      navigate("/");
      return;
    }

    if (authLoading || orgLoading) return;

    if (!user) {
      return;
    }

    localStorage.setItem(PENDING_ORG_JOIN_KEY, orgId);

    const isMember = memberships.some((m) => m.org_id === orgId);
    if (isMember) {
      localStorage.removeItem(PENDING_ORG_JOIN_KEY);
      navigate("/");
      return;
    }

    const joinOrg = async () => {
      setJoining(true);
      setJoinError(null);
      try {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", orgId)
          .single();
        if (org?.name) setOrgName(org.name);

        let data: any = null;
        const { data: edgeData, error } = await supabase.functions.invoke("join-org", { body: { orgId } });

        if (error) {
          const message = error.message || "Join failed";
          if (message.includes("Failed to send a request to the Edge Function")) {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData.session?.access_token;
            if (!accessToken) throw new Error("Signed-in session not found after Google auth.");

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            const fallbackRes = await fetch(`${supabaseUrl}/functions/v1/join-org`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                apikey: supabaseAnonKey,
              },
              body: JSON.stringify({ orgId }),
            });
            const fallbackData = await fallbackRes.json().catch(() => ({}));
            if (!fallbackRes.ok) throw new Error(fallbackData?.error || "Join failed");
            data = fallbackData;
          } else {
            throw error;
          }
        } else {
          data = edgeData;
        }

        if (data?.success) {
          localStorage.removeItem(PENDING_ORG_JOIN_KEY);
          await refetchMemberships();
          navigate("/", { replace: true });
        } else {
          throw new Error("Join failed");
        }
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : "Unable to complete invite flow.");
        setJoining(false);
      }
    };

    joinOrg();
  }, [orgId, user, authLoading, orgLoading, memberships, navigate, refetchMemberships]);

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
          {!user ? "Sign up to continue" : joining ? "Joining..." : "Waiting to retry..."}
        </p>
        {joinError && (
          <div className="mt-3">
            <p className="text-xs text-signal-red">{joinError}</p>
            <button
              onClick={() => window.location.reload()}
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
