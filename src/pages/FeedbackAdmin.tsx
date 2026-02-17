import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function relativeTime(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_STYLES: Record<string, string> = {
  bug: "bg-signal-red/20 text-signal-red",
  suggestion: "bg-blue-500/20 text-blue-600",
  question: "bg-signal-amber/20 text-signal-amber",
};

export default function FeedbackAdmin() {
  const { currentOrg, currentRole } = useOrg();

  const { data: feedback = [], isLoading, error } = useQuery({
    queryKey: ["feedback", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("feedback")
        .select("id, feedback_type, message, user_email, page, created_at")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && currentRole === "admin",
  });

  if (currentRole !== "admin") {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-signal-red">Failed to load feedback.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Feedback</h1>
      {feedback.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feedback yet.</p>
      ) : (
        <ul className="space-y-4">
          {feedback.map((f) => (
            <li key={f.id} className="border rounded-md p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
                    TYPE_STYLES[f.feedback_type as string] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {f.feedback_type}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {f.user_email ?? "—"} · {f.page ?? "—"}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {relativeTime(f.created_at)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{f.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
