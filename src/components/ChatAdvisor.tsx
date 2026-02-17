import { useState, useRef, useEffect } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";

const WELCOME_MESSAGE =
  "I'm the Build Authority Advisor. I have full context on your 5 active bets — their exposure, activity, and interruptions. Ask me anything: which bet is most at risk, what a field means, why the constraint exists, or what a stale bet costs you.";

export default function ChatAdvisor() {
  const { currentOrg } = useOrg();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !currentOrg?.id) return;

    const userMessage = { role: "user" as const, content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-advisor", {
        body: {
          messages: [...messages, userMessage],
          orgId: currentOrg.id,
        },
      });

      if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else if (error) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-foreground text-background shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label={isOpen ? "Close advisor" : "Open advisor"}
      >
        <span className="font-bold text-sm">{isOpen ? "✕" : "AI"}</span>
      </button>

      {/* Overlay (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={[
          "fixed right-0 top-0 h-full w-full sm:w-96 bg-background border-l shadow-2xl z-50 flex flex-col transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex-shrink-0">
          <h2 className="text-sm font-semibold">Build Authority Advisor</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ask about your bets, the program, or tradeoffs
          </p>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="bg-foreground text-background rounded-lg px-3 py-2 text-sm ml-12 max-w-[85%]">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm mr-8 whitespace-pre-wrap max-w-[85%]">
                  {m.content}
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex gap-1 items-center px-3 py-2">
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t flex-shrink-0">
          <div className="flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your bets..."
              disabled={loading}
              className="text-sm border rounded-lg px-3 py-2 flex-1 bg-background disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || !currentOrg?.id}
              className="ml-2 px-3 py-2 bg-foreground text-background rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
