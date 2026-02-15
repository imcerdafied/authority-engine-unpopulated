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

    if (!decision?.outcome_category || !decision?.expected_impact || !decision?.exposure_value) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: outcome_category, expected_impact, exposure_value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build structured prompt
    const prompt = `You are an enterprise decision-impact analyst. Given the following decision metadata, produce exactly 3 scenario projections. Return ONLY valid JSON, no markdown, no explanation.

Decision:
- Title: ${decision.title}
- Outcome Category: ${decision.outcome_category}
- Expected Impact: ${decision.expected_impact}
- Exposure Value: ${decision.exposure_value}
- Outcome Target: ${decision.outcome_target || "Not specified"}
- Impact Tier: ${decision.impact_tier || "Medium"}
- Domain: ${decision.solution_domain || "Cross"}
- Surface: ${decision.surface || "Not specified"}
- Current Delta: ${decision.current_delta || "None"}
- Revenue at Risk: ${decision.revenue_at_risk || "Not specified"}
- Segment Impact: ${decision.segment_impact || "Not specified"}
- Slice Window: ${decision.slice_deadline_days || 10} days

Return this exact JSON structure:
{
  "scenarios": [
    {
      "label": "On-Time Delivery",
      "impact_summary": "<1-2 sentence summary of expected outcome if delivered on time>",
      "exposure_shift": "<quantified shift in exposure, e.g. '-30% exposure reduction'>",
      "confidence": "<High/Medium/Low>"
    },
    {
      "label": "Delayed 10 Days",
      "impact_summary": "<1-2 sentence summary if delayed by 10 days>",
      "exposure_shift": "<quantified shift>",
      "confidence": "<High/Medium/Low>"
    },
    {
      "label": "Deprioritized",
      "impact_summary": "<1-2 sentence summary if deprioritized entirely>",
      "exposure_shift": "<quantified shift>",
      "confidence": "<High/Medium/Low>"
    }
  ]
}

Be analytical, concise, and credible. No hype. No speculation beyond reasonable inference from the data provided.`;

    const aiGatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const aiResponse = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      return new Response(
        JSON.stringify({ error: "Projection generation failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown fences if present)
    let scenarios: Scenario[];
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      scenarios = parsed.scenarios;
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse projection results" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute metadata hash for change detection
    const metadataHash = btoa(
      `${decision.outcome_category}|${decision.expected_impact}|${decision.exposure_value}|${decision.outcome_target || ""}|${decision.current_delta || ""}`
    );

    // Store in DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert: delete old projections for this decision, insert new
    await supabase
      .from("decision_projections")
      .delete()
      .eq("decision_id", decision.id);

    const { data: inserted, error: insertError } = await supabase
      .from("decision_projections")
      .insert({
        decision_id: decision.id,
        org_id: decision.org_id,
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
