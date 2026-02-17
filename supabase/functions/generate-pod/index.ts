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

First, classify the bet into one of these categories based on its title, outcome target, and exposure:

1. GTM / Commercial Motion — bets about positioning, narrative shifts, sales strategy, renewal approaches, pricing, or go-to-market changes. These are NOT engineering builds. Examples: "adopt DPI as renewal narrative", "reposition product for enterprise". Pod is sales/CS-heavy:
   - Sales/GTM Lead, 1-2 Customer Success Leads, 1 Sales Enablement, 1 Marketing Partner, 0.5 Finance Partner, 1 Engineering Lead (for tooling only, NOT building product), optional 1-2 engineers for dashboards/tooling. Typical total: 5-8.

2. Product Build / Platform — bets about building, unifying, or shipping product capabilities. These are engineering-heavy. Examples: "unify pattern detection and predictive intelligence", "ship segmentation as platform service". Pod is engineering-heavy:
   - Senior PM, Engineering Lead, 8-12 engineers, 2-3 Data Scientists, 1 Design Lead, 1 GTM Partner, 0.5 Finance Partner. Typical total: 14-19.

3. Infrastructure / Platform Foundation — bets about foundational systems that other bets depend on. Examples: "segmentation as first-class infrastructure". Pod is engineering-heavy with platform focus:
   - PM (platform mindset), Engineering Lead, 8-10 engineers, 2 Data Engineers, 1 Data Scientist, 1 Platform SRE. Typical total: 13-16.

4. Strategic Differentiation / R&D — bets about category definition, AI capabilities, or long-term technical moats. Examples: "agent outcome intelligence", "role in agentic stack". Pod is architecture and research-heavy:
   - PM (technical, AI-fluent), Engineering Lead (architecture-heavy), 8-12 engineers, 3 Data Scientists, 1 Platform Architect, 1 GTM Strategist, 0.5 Finance Partner. Typical total: 16-20.

5. Executive / Positioning — bets about how the product is perceived by executives and the market. Examples: "executive decision layer", "bridge strategy vs growth bet". Pod is design and GTM-heavy:
   - PM (executive empathy), 1 Design Director, 3-5 engineers (frontend + API), 1 Data Partner, 1 Sales/Marketing Partner, 0.5 Finance Partner. Typical total: 7-10.

CRITICAL: Do NOT put 10+ engineers on a bet that is fundamentally a sales motion or narrative shift. If the bet is about changing how something is sold, positioned, or communicated — it needs GTM people, not engineers. Only assign significant engineering headcount when the bet requires building or modifying product/platform capabilities.

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
