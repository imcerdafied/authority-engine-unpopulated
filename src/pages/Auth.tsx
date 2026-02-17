import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const VALID_INVITE_CODE = "buildauthority2026";
const PENDING_ORG_JOIN_KEY = "pending_org_join";

interface AuthProps {
  skipInviteCode?: boolean;
}

export default function Auth({ skipInviteCode }: AuthProps = {}) {
  const location = useLocation();
  const { orgId } = useParams<{ orgId?: string }>();
  const isJoinFlow = skipInviteCode || /^\/join\/[^/]+$/.test(location.pathname);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "signup") {
      if (!isJoinFlow) {
        if (inviteCode.trim().toLowerCase() !== VALID_INVITE_CODE) {
          setError("Invalid invite code. Contact your admin for access.");
          setLoading(false);
          return;
        }
      }
      if (isJoinFlow && orgId) {
        localStorage.setItem(PENDING_ORG_JOIN_KEY, orgId);
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: email.split("@")[0] },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for the confirmation link.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      }
    }

    setLoading(false);
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
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => { setMode("login"); setError(null); setMessage(null); }}
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider pb-1 border-b-2 transition-colors",
                mode === "login" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider pb-1 border-b-2 transition-colors",
                mode === "signup" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
              )}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && !isJoinFlow && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="Enter invite code"
                />
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-signal-red font-medium">{error}</p>
            )}
            {message && (
              <p className="text-xs text-signal-green font-medium">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-[11px] font-semibold uppercase tracking-wider text-white bg-black px-4 py-2.5 rounded-sm hover:bg-black/90 transition-colors disabled:opacity-50"
            >
              {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
