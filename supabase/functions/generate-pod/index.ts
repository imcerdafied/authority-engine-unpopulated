import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METHODOLOGY = `You are a strategic pod configuration advisor for Build Authority. You generate suggested team compositions for strategic bets based on this methodology:

POD CONFIGURATION PRINCIPLES:
1. Pods are decision units, not feature teams. Each pod exists to drive measurable progress against a specific strategic choice.
2. Every pod must include representation from: Product, Engineering, Design, Data, GTM liaison, and Finance partner.
3. No pod ships features detached from revenue or capital logic.
4. Pods are sized using: Expected Value × Probability of Success × Time to Impact.
5. Every pod must answer: What revenue does this unlock? What revenue does this defend? What cost does this reduce? What renewal risk does this mitigate?

COMPOSITION PATTERNS BY BET TYPE:
- Revenue defense / migration bets: Senior PM (commercially sharp), Engineering Lead (platform depth), 4-6 engineers, 1 Data Scientist, 1 Design Lead, 1 Customer Success Lead, 0.5 Finance Partner
- Product expansion / growth bets: Senior PM (growth-oriented), Engineering Lead (application + analytics), 5-7 engineers, 2 Data Scientists, 1 Design Lead, 1 Sales Engineer / GTM Partner, 0.5 Finance Partner
- Infrastructure / platform bets: PM (platform mindset), Engineering Lead (data infrastructure), 5-6 engineers, 1 Data Engineer, 1 Data Scientist, 0.5 Platform SRE
- Executive / positioning bets: PM (executive empathy), Engineering Lead (frontend + API), 3-4 engineers, 1 Design Director, 1 Data Partner, 1 Sales/Marketing Partner
- Strategic differentiation / AI bets: PM (technical, AI-fluent), Engineering Lead (architecture-heavy), 4-6 engineers, 2 Data Scientists, 1 Platform Architect, 1 GTM Strategist, 0.5 Finance Partner

STRUCTURAL RULES:
- Shared layers (telemetry, identity, event ingestion, pattern engine) remain coordinated through weekly Pod-of-Pods sync
- Sibling bets sharing infrastructure should share platform architects
- Core defense pods are adequately funded; expansion wedges are commercially viable; long-term differentiation is built without starving near-term revenue

RESPONSE FORMAT:
Return ONLY valid JSON with this structure:
{
  "pod_name": "Short name for this pod",
  "pod_type": "revenue_defense | product_expansion | infrastructure | executive_positioning | strategic_differentiation",
  "mandate": "2-3 sentence mandate for this pod",
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
  "dependencies": ["List of shared infrastructure or sibling pod dependencies"],
  "sizing_rationale": "1-2 sentences on why this size based on expected value x probability x time to impact"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bet } = await req.json();
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const userMessage = `Generate a pod configuration for this strategic bet:

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

Based on the methodology, what is the recommended pod composition?`;

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
