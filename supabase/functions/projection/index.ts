import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DecisionInput {
  id: string;
  org_id: string;
  title: string;
  outcome_category: string;
  outcome_category_key?: string;
  expected_impact: string;
  exposure_value: string;
  outcome_target?: string;
  impact_tier?: string;
  solution_domain?: string;
  surface?: string;
  current_delta?: string;
  revenue_at_risk?: string;
  segment_impact?: string;
  owner?: string;
  slice_deadline_days?: number;
}

interface Scenario {
  label: string;
  impact_summary: string;
  exposure_shift: string;
  confidence: string;
}

function buildFallbackScenarios(decision: {
  expected_impact?: string | null;
  exposure_value?: string | null;
  revenue_at_risk?: string | null;
}): Scenario[] {
  const impact = decision.expected_impact || "expected impact";
  const upside = decision.exposure_value || "upside exposure";
  const risk = decision.revenue_at_risk || "risk exposure";
  return [
    {
      label: "On-Time Delivery",
      impact_summary: `Execution stays on plan and compounds ${impact}.`,
      exposure_shift: `Lower - improves realization of ${upside} while reducing downside in ${risk}.`,
      confidence: "Medium",
    },
    {
      label: "Delayed 10 Days",
      impact_summary: `Momentum softens and delivery value realization is deferred.`,
      exposure_shift: `Higher - delays upside from ${upside} and increases downside pressure in ${risk}.`,
      confidence: "Medium",
    },
    {
      label: "Deprioritized",
      impact_summary: `Outcome progress stalls and strategic value is deferred to a later cycle.`,
      exposure_shift: `Higher - upside from ${upside} is not captured and downside in ${risk} persists.`,
      confidence: "High",
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { decision } = (await req.json()) as { decision: DecisionInput };
    if (!decision?.id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: decision.id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
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

    const { data: trustedDecision, error: decisionReadError } = await userClient
      .from("decisions")
      .select(
        "id, org_id, title, outcome_category, outcome_category_key, expected_impact, exposure_value, outcome_target, impact_tier, solution_domain, surface, current_delta, revenue_at_risk, segment_impact, owner, slice_deadline_days"
      )
      .eq("id", decision.id)
      .maybeSingle();
    if (decisionReadError) {
      return new Response(JSON.stringify({ error: "Failed to load decision" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!trustedDecision) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (decision.org_id && decision.org_id !== trustedDecision.org_id) {
      return new Response(JSON.stringify({ error: "Invalid org_id for decision" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outcomeCategory = trustedDecision.outcome_category || trustedDecision.outcome_category_key || "";
    const upsideExposure = trustedDecision.exposure_value || "";
    const riskExposure = trustedDecision.revenue_at_risk || "";
    if (!outcomeCategory || !trustedDecision.expected_impact || (!upsideExposure && !riskExposure)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: category, expected_impact, and upside/risk exposure" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build structured prompt
    const prompt = `You are an enterprise decision-impact analyst. Given the following decision metadata, produce exactly 3 scenario projections. Return ONLY valid JSON, no markdown, no explanation.

Decision:
- Title: ${trustedDecision.title}
- Outcome Category: ${outcomeCategory}
- Expected Impact: ${trustedDecision.expected_impact}
- Upside Exposure: ${upsideExposure || "Not specified"}
- Risk Exposure: ${riskExposure || "Not specified"}
- Outcome Target: ${trustedDecision.outcome_target || "Not specified"}
- Impact Tier: ${trustedDecision.impact_tier || "Medium"}
- Domain: ${trustedDecision.solution_domain || "Cross"}
- Surface: ${trustedDecision.surface || "Not specified"}
- Current Delta: ${trustedDecision.current_delta || "None"}
- Revenue at Risk: ${trustedDecision.revenue_at_risk || "Not specified"}
- Segment Impact: ${trustedDecision.segment_impact || "Not specified"}
- Slice Window: ${trustedDecision.slice_deadline_days || 10} days

Return this exact JSON structure:
{
  "scenarios": [
    {
      "label": "On-Time Delivery",
      "impact_summary": "<1-2 sentence summary of expected outcome if delivered on time>",
      "exposure_shift": "<change in upside/risk exposure relative to current state; keep it concrete and directional>",
      "confidence": "<High/Medium/Low>"
    },
    {
      "label": "Delayed 10 Days",
      "impact_summary": "<1-2 sentence summary if delayed by 10 days>",
      "exposure_shift": "<change in upside/risk exposure>",
      "confidence": "<High/Medium/Low>"
    },
    {
      "label": "Deprioritized",
      "impact_summary": "<1-2 sentence summary if deprioritized entirely>",
      "exposure_shift": "<change in upside/risk exposure>",
      "confidence": "<High/Medium/Low>"
    }
  ]
}

Be analytical, concise, and credible. No hype. No speculation beyond reasonable inference from the data provided.`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "Projection function missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 900,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    let scenarios: Scenario[];
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Anthropic error; using fallback scenarios:", errText);
      scenarios = buildFallbackScenarios(trustedDecision);
    } else {
      const aiData = await aiResponse.json();
      const content = aiData?.content?.[0]?.text || "";
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed?.scenarios) || parsed.scenarios.length !== 3) {
          throw new Error("Invalid scenarios format");
        }
        scenarios = parsed.scenarios as Scenario[];
      } catch {
        console.error("Failed to parse AI response; using fallback:", content);
        scenarios = buildFallbackScenarios(trustedDecision);
      }
    }

    // Compute metadata hash for change detection
    const metadataHash = btoa(
      `${outcomeCategory}|${trustedDecision.expected_impact}|${upsideExposure}|${riskExposure}|${trustedDecision.outcome_target || ""}|${trustedDecision.current_delta || ""}`
    );

    // Store in DB
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert: delete old projections for this decision, insert new
    await supabase
      .from("decision_projections")
      .delete()
      .eq("decision_id", trustedDecision.id)
      .eq("org_id", trustedDecision.org_id);

    const { data: inserted, error: insertError } = await supabase
      .from("decision_projections")
      .insert({
        decision_id: trustedDecision.id,
        org_id: trustedDecision.org_id,
        scenarios: scenarios,
        decision_metadata_hash: metadataHash,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        scenarios,
        generated_at: inserted?.generated_at || new Date().toISOString(),
        metadata_hash: metadataHash,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Projection error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
