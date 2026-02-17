import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/pages/Auth";

export default function Join() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading, refetchMemberships } = useOrg();
  const [joining, setJoining] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      navigate("/");
      return;
    }

    if (authLoading || orgLoading) return;

    if (!user) {
      return;
    }

    const isMember = memberships.some((m) => m.org_id === orgId);
    if (isMember) {
      navigate("/");
      return;
    }

    const joinOrg = async () => {
      setJoining(true);
      try {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", orgId)
          .single();
        if (org?.name) setOrgName(org.name);

        const { data, error } = await supabase.functions.invoke("join-org", {
          body: { orgId },
        });

        if (error) throw error;
        if (data?.success) {
          await refetchMemberships();
          navigate("/", { replace: true });
        } else {
          throw new Error("Join failed");
        }
      } catch {
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
          {!user ? "Sign up to continue" : joining ? "Joining..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
}
