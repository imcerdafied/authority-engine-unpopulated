import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METHODOLOGY = `You are a strategic outcome-pod advisor for Build Authority.

Your job is to design a BET OUTCOME POD: a cross-functional SWAT team accountable for moving one bet outcome, not an engineering delivery pod.

Non-negotiable rules:
1. Default to cross-functional coverage. Include roles across Product, Engineering, Design, Data/Analytics, GTM (Sales or CS or Marketing), and Finance.
2. Do not assume the pod is engineering-heavy. Engineering is just one function and should scale with true build complexity.
3. For GTM/narrative/renewal/positioning bets, keep engineering minimal (often 0-2) and emphasize GTM, CS, Sales Enablement, Marketing, and Finance.
4. For platform/build-heavy bets, include engineering strongly, but still keep explicit GTM and Finance representation for outcome accountability.
5. Treat capability/platform pods as dependencies only. Do not model them as this pod's core composition.
6. Every composition must explain why each function is needed to realize the outcome.

Sizing logic:
- Size by expected value, probability, and time to impact.
- Keep teams lean; avoid inflated headcount.
- total_headcount must equal the sum of composition counts.

Response format:
Return ONLY valid JSON with this exact shape:
{
  "pod_name": "Short name for this bet outcome pod",
  "pod_type": "outcome_pod",
  "mandate": "2-3 sentence mandate focused on outcome realization",
  "composition": [
    { "role": "Role title", "count": 1, "note": "Why this role is required for the outcome" }
  ],
  "total_headcount": 0,
  "financial_accountability": {
    "revenue_unlocked": "Description or null",
    "revenue_defended": "Description or null",
    "cost_reduced": "Description or null",
    "renewal_risk_mitigated": "Description or null"
  },
  "dependencies": ["Capability pod or shared-system dependencies"],
  "sizing_rationale": "1-2 sentences on why this pod size is appropriate"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bet } = await req.json();
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const userMessage = `Generate a bet outcome pod recommendation for this strategic bet:

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

Based on the methodology, what is the recommended cross-functional outcome pod composition?`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
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
