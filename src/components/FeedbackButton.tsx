import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type FeedbackType = "bug" | "suggestion" | "question";

export default function FeedbackButton() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [thanks, setThanks] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!thanks) return;
    const t = setTimeout(() => setThanks(false), 2000);
    return () => clearTimeout(t);
  }, [thanks]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        const btn = (e.target as HTMLElement).closest("button");
        if (!btn?.textContent?.includes("Feedback") && !btn?.textContent?.includes("Thanks")) {
          setOpen(false);
        }
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentOrg || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from("feedback").insert({
        org_id: currentOrg.id,
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        page: window.location.pathname,
        feedback_type: type,
        message: message.trim(),
      });
      setThanks(true);
      setOpen(false);
      setMessage("");
      setType("suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={formRef} className="fixed bottom-6 left-6 z-50">
      {open && (
        <form
          onSubmit={handleSubmit}
          className="absolute bottom-12 left-0 w-80 bg-background border rounded-lg shadow-xl p-4 z-50"
        >
          <h3 className="text-sm font-semibold mb-3">Share Feedback</h3>
          <div className="flex gap-2 mb-3">
            {(["bug", "suggestion", "question"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "text-[10px] uppercase tracking-wider rounded-full px-2.5 py-1 transition-colors",
                  type === t
                    ? "bg-foreground text-background"
                    : "border text-muted-foreground hover:border-foreground/50"
                )}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            required
            rows={3}
            className="w-full text-sm border rounded px-2 py-1.5 bg-background mb-3 resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="text-[11px] uppercase tracking-wider bg-foreground text-background rounded px-3 py-1.5 w-full disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </form>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "text-[10px] uppercase tracking-wider text-muted-foreground border rounded-full px-3 py-1.5 bg-background hover:bg-muted transition-colors shadow-sm",
          thanks && "text-signal-green"
        )}
      >
        {thanks ? "Thanks ✓" : "Feedback"}
      </button>
    </div>
  );
}
