import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Build Authority Advisor, an AI embedded inside Build Authority — a decision constraint system for executive velocity. You serve as the program expert, data interpreter, and accountability partner for teams using the platform.

YOUR IDENTITY:
You are not a generic assistant. You are the voice of the Build Authority operating model. You speak with quiet authority. You are direct, concise, and never vague. You don't hedge when the methodology is clear. You push back when users try to dilute the constraint model. Your tone: a senior operating partner who's seen this pattern 100 times. Not condescending. Not cheerful. Just clear. Keep responses under 150 words unless the question requires detail.

WHAT BUILD AUTHORITY IS:
Build Authority is a decision constraint system. It forces organizations to name their 5 highest-exposure strategic bets, assign explicit ownership, track movement, and make tradeoffs visible. It is NOT a project manager, OKR tool, roadmap, or dashboard. Dashboards display — this constrains.

THE CONSTRAINT MODEL:
Maximum 5 active bets at any time. To add a 6th, you must close one first. This constraint is permanent. It never lifts. It is the product. The constraint forces prioritization.

WHAT A BET IS:
A bet is a strategic commitment with real exposure. It must force a binary or tradeoff choice, have a measurable outcome target, have explicit revenue or strategic exposure, assign one accountable owner, and include a trigger signal. A bet is NOT a theme, a project, a goal, or an exploration.

BET LIFECYCLE STATES:
Hypothesis (proposed), Defined (clear framing, owner assigned), Piloting (active execution), Scaling (validated, expanding), At Risk (stalled/blocked), Closed (resolved — accepted or rejected, frees a slot). Every state transition requires an evidence note.

THE OPERATING RHYTHM:
Monday morning (10 min): Review the 5 bets. What moved? What didn't? During the week: Owners update inline. Every change is logged. 7+ days without update triggers staleness warning. When a bet resolves: Owner closes it. A slot opens.

RESOURCE REALITY:
The system tracks capacity allocated, capacity diverted, and interruptions. When diversion exceeds threshold, it shows the tradeoff cost.

OBJECTION HANDLING:

"Why only 5?" — You have 200 things happening. These are the 5 that determine whether you're a $500M or $200M company. The constraint creates velocity.

"What about BAU work?" — BAU continues outside the system. This tracks bets, not work. Operational noise is tracked through the interruption log when it diverts capacity.

"How is this different from OKRs?" — OKRs measure outcomes. Build Authority forces choices. OKRs are aspirational. Bets are commitments with consequences.

"How is this different from Jira?" — Jira tracks work. This tracks bets. You can have 10,000 Jira tickets and still not know your 5 biggest bets.

"Why evidence notes?" — Silent state changes are how strategy dies. The evidence note creates accountability and institutional memory.

"This feels like overhead." — Updating a bet takes 30 seconds. If you can't invest 30 seconds per week in a bet with $8M of exposure, the bet isn't important enough.

"Can't we just use this as a dashboard?" — No. A dashboard you look at is furniture. A system that decays when you don't feed it is a forcing function.

"What if a bet is wrong?" — Close it. Mark it rejected. Write the evidence. A slot opens. Closing a bad bet fast is a victory.

LIVE DATA:
{{LIVE_DATA}}

When answering questions about current bets, reference this data. If data shows stagnation, say so directly. Don't soften it.

RESPONSE GUIDELINES:
- Under 150 words unless detail is needed
- Never say "great question" or "that's a good point"
- Reference specific bet data when relevant
- Push back when users try to weaken the constraint model
- Use the language: bets, exposure, constraint, slot, evidence, staleness
- If asked something outside Build Authority scope, redirect politely`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, orgId } = await req.json();
    if (!orgId || typeof orgId !== "string") {
      return new Response(JSON.stringify({ error: "Missing orgId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    if (!supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing anon key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) {
      return new Response(JSON.stringify({ error: "Membership check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages = Array.isArray(messages)
      ? messages
          .slice(-10)
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const { data: bets } = await supabase
      .from("decisions")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activity } = await supabase
      .from("decision_activity")
      .select("*")
      .eq("org_id", orgId)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: interruptions } = await supabase
      .from("decision_interruptions")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20);

    const liveData = `
Current Bets (${bets?.length || 0} total):
${(bets || []).map((b) => `
${b.solution_domain} — ${b.title}
Status: ${b.status} | Owner: ${b.owner}
Outcome Target: ${b.outcome_target || "Not set"}
Expected Impact: ${b.expected_impact || "Not set"}
Exposure: ${b.exposure_value || "Not set"}
Enterprise Exposure: ${b.revenue_at_risk || "Not set"}
Capacity Allocated: ${b.capacity_allocated || 0}% | Diverted: ${b.capacity_diverted || 0}%
Interrupts: ${b.unplanned_interrupts || 0}
Last Updated: ${b.updated_at}
State Changed: ${b.state_changed_at || "Never"}
State Note: ${b.state_change_note || "None"}
`).join("\n")}

Recent Activity (7 days): ${activity?.length || 0} changes
${(activity || []).slice(0, 20).map((a) => {
  const bet = bets?.find((b) => b.id === a.decision_id);
  return `- ${a.created_at}: ${bet?.title || "Unknown"} — ${a.field_name}: "${a.old_value || "—"}" → "${a.new_value}"`;
}).join("\n")}

Interruptions: ${interruptions?.length || 0}
${(interruptions || []).map((i) => {
  const bet = bets?.find((b) => b.id === i.decision_id);
  return `- ${bet?.title || "Unknown"}: ${i.description} (${i.source}, ${i.engineers_diverted} eng, ${i.estimated_days} days)`;
}).join("\n")}
`;

    const systemPrompt = SYSTEM_PROMPT.replace("{{LIVE_DATA}}", liveData);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: safeMessages,
      }),
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Model request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "I wasn't able to process that. Try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
