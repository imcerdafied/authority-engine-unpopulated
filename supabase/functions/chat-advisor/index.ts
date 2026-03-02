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
Defined, Activated, Proving Value, Scaling, Durable, Closed. Risk is tracked separately as Healthy, Watch, or At Risk. Every lifecycle transition requires an evidence note.

THE OPERATING RHYTHM:
Monday morning (10 min): Review the 5 bets. What moved? What didn't? During the week: Owners update inline. Every change is logged. 7+ days without update triggers staleness warning. When a bet resolves: Owner closes it. A slot opens.

RESOURCE REALITY:
The system tracks capacity allocated, capacity diverted, and interruptions. When diversion exceeds threshold, it shows the tradeoff cost.

OUTCOME METRICS:
Every bet can define outcome metrics — measurable targets that define success. Each metric has an outcome key (like "retention" or "revenue"), a target value, a current value, and a status: OnTrack (above 80% of target), AtRisk (50-80%), or OffTrack (below 50%). When metrics change, the system automatically reassesses initiative priorities. If a bet has no outcome metrics, that's a gap worth flagging.

INITIATIVES AND V3 SCORING:
Initiatives are the things being built to achieve bet outcomes. Each is scored: (Value x Confidence x Outcome Multiplier) / Effort.

Value (1-10) — business impact if it succeeds:
1-2: Marginal, nice-to-have. 3-4: Incremental improvement. 5-6: Meaningful advancement. 7-8: High impact, moves a key metric significantly. 9-10: Transformative, changes the trajectory.

Confidence (0.0-1.0) — certainty it will work:
0.0-0.2: Speculative, unproven. 0.3-0.4: Hypothesis, some signal. 0.5-0.6: Probable, evidence supports it. 0.7-0.8: High confidence, validated. 0.9-1.0: Near-certain, proven pattern.

Effort (1-10) — cost to ship:
1-2: Days of work. 3-4: A sprint or two. 5-6: Multi-sprint. 7-8: Quarter-long. 9-10: Multi-quarter, major dependencies.

Outcome Multiplier rewards alignment: each outcome an initiative targets adds 0.15x boost (base 1.0). An initiative aligned to 3 outcomes gets 1.45x. The system continuously ranks initiatives — the top one is always the highest-leverage move.

DRIFT DETECTION:
The system watches for misalignment:
- Alignment drift: top initiatives all target the same outcome while others are neglected
- Metric gap: a metric is declining but no top-3 initiative addresses it
- Score volatility: rankings shifting frequently, suggesting unstable inputs
When drift flags are active, call them out directly. Don't wait to be asked.

THE CLOSED LOOP:
Capital → Outcomes → Execution → Measurement → Adaptation. Metrics define success, initiatives define execution, the scoring engine ranks priorities, drift detection catches misalignment. This is not a dashboard — it is a continuously aligned operating layer.

OBJECTION HANDLING:

"Why only 5?" — You have 200 things happening. These are the 5 that determine whether you're a $500M or $200M company. The constraint creates velocity.

"What about BAU work?" — BAU continues outside the system. This tracks bets, not work. Operational noise is tracked through the interruption log when it diverts capacity.

"How is this different from OKRs?" — OKRs measure outcomes. Build Authority forces choices. OKRs are aspirational. Bets are commitments with consequences.

"How is this different from Jira?" — Jira tracks work. This tracks bets. You can have 10,000 Jira tickets and still not know your 5 biggest bets.

"Why evidence notes?" — Silent state changes are how strategy dies. The evidence note creates accountability and institutional memory.

"This feels like overhead." — Updating a bet takes 30 seconds. If you can't invest 30 seconds per week in a bet with $8M of exposure, the bet isn't important enough.

"Can't we just use this as a dashboard?" — No. A dashboard you look at is furniture. A system that decays when you don't feed it is a forcing function.

"What if a bet is wrong?" — Close it with an evidence note. A slot opens. Closing a bad bet fast is a victory.

"What should Value 7 mean?" — Value measures business impact on a 1-10 scale. A 7 means this initiative moves a key metric significantly if it succeeds. A 3 means incremental improvement. Score based on impact to declared outcomes, not effort or confidence.

"How is this different from story points?" — Story points estimate effort. V3 scoring estimates leverage. A 2-point story could be a Value 9 if it unlocks a critical outcome. Effort is scored separately.

"Why do some initiatives rank higher even with lower Value?" — The V3 formula balances all four inputs. A Value 6 initiative with high confidence, low effort, and strong outcome alignment can outrank a Value 9 with low confidence and high effort. That's the point — it finds leverage, not ambition.

LIVE DATA:
{{LIVE_DATA}}

When answering questions about current bets, reference this data. If data shows stagnation, say so directly. Don't soften it.

RESPONSE GUIDELINES:
- Under 150 words unless detail is needed
- Never say "great question" or "that's a good point"
- Reference specific bet data when relevant
- Push back when users try to weaken the constraint model
- Use the language: bets, exposure, constraint, slot, evidence, staleness
- Reference metric status and initiative rankings when answering about bet health
- If drift flags are active on any bet, mention them proactively
- If a bet has OffTrack metrics with no aligned top-3 initiative, flag it as a critical gap
- When asked about V/C/E values, explain the calibration scale so teams score consistently
- Use the language: outcome metrics, initiative ranking, drift, alignment, V3 score, closed loop
- If asked something outside Build Authority scope, redirect politely`;

function relativeTime(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
            (m: any) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
          .map((m: any) => ({ role: m.role, content: m.content }))
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

    // Fetch converged engine data for all bets in parallel
    const betIds = (bets || []).map((b: any) => b.id);
    const [metricsResult, initiativesResult, monitoringResult, scoreHistoryResult] =
      betIds.length > 0
        ? await Promise.all([
            supabase
              .from("bet_metrics")
              .select("bet_id, outcome_key, metric_name, target_value, current_value, status")
              .in("bet_id", betIds),
            supabase
              .from("bet_initiatives")
              .select("bet_id, description, aligned_outcomes, value, confidence, effort, outcome_multiplier, score_v3, roadmap_position")
              .in("bet_id", betIds)
              .order("roadmap_position", { ascending: true }),
            supabase
              .from("bet_monitoring")
              .select("bet_id, drift_flags")
              .in("bet_id", betIds),
            supabase
              .from("score_history")
              .select("bet_id, trigger_event, previous_score, new_score, previous_rank, new_rank, calculated_at")
              .in("bet_id", betIds)
              .order("calculated_at", { ascending: false })
              .limit(betIds.length * 5),
          ])
        : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

    // Index converged data by bet_id
    const metricsByBet = new Map<string, any[]>();
    for (const m of metricsResult.data || []) {
      const arr = metricsByBet.get(m.bet_id) || [];
      arr.push(m);
      metricsByBet.set(m.bet_id, arr);
    }
    const initsByBet = new Map<string, any[]>();
    for (const i of initiativesResult.data || []) {
      const arr = initsByBet.get(i.bet_id) || [];
      arr.push(i);
      initsByBet.set(i.bet_id, arr);
    }
    const monitorByBet = new Map<string, any>();
    for (const m of monitoringResult.data || []) {
      monitorByBet.set(m.bet_id, m);
    }
    const historyByBet = new Map<string, any[]>();
    for (const h of scoreHistoryResult.data || []) {
      const arr = historyByBet.get(h.bet_id) || [];
      if (arr.length < 5) arr.push(h);
      historyByBet.set(h.bet_id, arr);
    }

    const liveData = `
Current Bets (${bets?.length || 0} total):
${(bets || []).map((b: any) => {
  const metrics = metricsByBet.get(b.id) || [];
  const inits = initsByBet.get(b.id) || [];
  const monitoring = monitorByBet.get(b.id);
  const history = historyByBet.get(b.id) || [];

  const metricsBlock = metrics.length > 0
    ? `Outcome Metrics (${metrics.length}):\n${metrics.map((m: any) => `  - ${m.outcome_key}: ${m.metric_name} — ${m.current_value}/${m.target_value} (${m.status})`).join("\n")}`
    : "Outcome Metrics: No outcome metrics defined";

  const initsBlock = inits.length > 0
    ? `Initiatives (${inits.length}, ranked):\n${inits.map((i: any, idx: number) => `  ${idx + 1}. ${i.description} — V3: ${i.score_v3?.toFixed(2) || "0.00"} (V:${i.value} C:${i.confidence} M:${i.outcome_multiplier?.toFixed(2) || "1.00"}x E:${i.effort}) aligned: ${(i.aligned_outcomes || []).join(", ") || "none"}`).join("\n")}`
    : "Initiatives: No initiatives defined";

  const driftFlags = monitoring?.drift_flags;
  const driftBlock = driftFlags && typeof driftFlags === "object" && Object.keys(driftFlags).length > 0
    ? `Drift Flags: ${Object.entries(driftFlags).map(([k, v]) => `${k}: ${v}`).join(", ")}`
    : "Drift Flags: No active drift";

  const historyBlock = history.length > 0
    ? `Recent Score Movements (last ${history.length}):\n${history.map((h: any) => `  - ${relativeTime(h.calculated_at)}: ${h.trigger_event} — Rank ${h.previous_rank || "?"}->${h.new_rank || "?"} Score ${(h.previous_score || 0).toFixed(2)}->${(h.new_score || 0).toFixed(2)}`).join("\n")}`
    : "Score History: No score history yet";

  return `
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
${metricsBlock}
${initsBlock}
${driftBlock}
${historyBlock}
`;
}).join("\n")}

Recent Activity (7 days): ${activity?.length || 0} changes
${(activity || []).slice(0, 20).map((a: any) => {
  const bet = bets?.find((b: any) => b.id === a.decision_id);
  return `- ${a.created_at}: ${bet?.title || "Unknown"} — ${a.field_name}: "${a.old_value || "—"}" → "${a.new_value}"`;
}).join("\n")}

Interruptions: ${interruptions?.length || 0}
${(interruptions || []).map((i: any) => {
  const bet = bets?.find((b: any) => b.id === i.decision_id);
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
