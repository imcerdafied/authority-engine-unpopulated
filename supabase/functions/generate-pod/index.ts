import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METHODOLOGY = `You are a strategic bet-unit design advisor for Build Authority.
Your job is to propose a cross-functional execution unit for one strategic bet.

BET-UNIT PRINCIPLES:
1. The unit exists to move one bet, not to own a function.
2. Design around accountability, decision velocity, and measurable movement.
3. Do not default to engineering-heavy staffing. Match roles to the real bottleneck.
4. Include explicit cross-functional coverage: business owner, product/program lead, delivery/operations, go-to-market/customer, finance/analytics, and engineering/technical where needed.
5. Prefer lean teams with clear ownership over large teams with diffuse accountability.

COMPOSITION GUIDANCE:
- GTM / narrative / commercial motion bets: sales, CS, enablement, marketing, finance; minimal engineering unless tooling is required.
- Product capability bets: product, engineering, design, data, GTM, finance.
- Platform / infrastructure bets: engineering, platform, data, product; include business liaison.
- Executive positioning bets: strategy, product, design, GTM, analytics; limited engineering.
- Renewal-risk / customer health bets: CS, support, product, data, finance; targeted engineering only.

RULES:
- Count must be whole numbers (integers).
- Keep total headcount practical (usually 4-12 unless truly justified).
- Every role note must explain why that role is needed for this bet now.
- Keep mandate concrete and tied to exposure + outcome target.

RESPONSE FORMAT:
Return ONLY valid JSON with this structure:
{
  "pod_name": "Short name for this unit",
  "pod_type": "revenue_defense | product_expansion | infrastructure | executive_positioning | strategic_differentiation",
  "mandate": "2-3 sentence mandate for this bet unit",
  "composition": [
    { "role": "Role title", "count": 1, "note": "Brief note on why this role" }
  ],
  "total_headcount": 0,
  "financial_accountability": {
    "revenue_unlocked": "Description or null",
    "revenue_defended": "Description or null",
    "cost_reduced": "Description or null",
    "renewal_risk_mitigated": "Description or null"
  },
  "dependencies": ["Shared dependencies or partner teams"],
  "sizing_rationale": "1-2 sentences on why this team shape is right for the current bet stage"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bet } = await req.json();
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const userMessage = `Generate a cross-functional bet-unit configuration for this strategic bet:

Title: ${bet.title}
Solution Domain: ${bet.solution_domain}
Owner: ${bet.owner}
Outcome Target: ${bet.outcome_target || "Not set"}
Expected Impact: ${bet.expected_impact || "Not set"}
Exposure: ${bet.exposure_value || "Not set"}
Enterprise Exposure: ${bet.revenue_at_risk || "Not set"}
Status: ${bet.status}
Surface: ${bet.surface || "Not set"}
Category: ${bet.outcome_category_key || "Not set"}

Based on the methodology, what is the recommended unit composition?`;

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
        system: METHODOLOGY,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Model request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response, stripping any markdown fences
    const clean = text.replace(/```json|```/g, "").trim();
    const podConfig = JSON.parse(clean);

    return new Response(JSON.stringify({ pod: podConfig }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
