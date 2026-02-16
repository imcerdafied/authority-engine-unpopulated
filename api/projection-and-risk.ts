import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  if (!hasSupabaseUrl || !hasServiceRoleKey || !hasAnthropicKey) {
    return res.status(500).json({
      error: "Missing env vars",
      hasSupabaseUrl,
      hasServiceRoleKey,
      hasAnthropicKey,
      envKeysSample: Object.keys(process.env).filter(Boolean).slice(0, 50),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY as string,
  });
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const prompt = `
You are an enterprise decision analyst.

Generate three scenario projections:
1) On-Time Delivery
2) Delayed by 10 Days
3) Deprioritized

Rules:
- Use only provided data.
- impact_summary <= 35 words.
- confidence must be Low, Medium, or High.
- Return raw JSON only.

Decision:
Title: ${body.title}
Domain: ${body.domain}
Surface: ${body.surface}
Outcome Category: ${body.outcome_category}
Expected Impact: ${body.expected_impact}
Exposure Value: ${body.exposure_value}

Return JSON exactly:

{
  "on_time": { "impact_summary": "", "exposure_shift": "", "confidence": "" },
  "delayed_10_days": { "impact_summary": "", "exposure_shift": "", "confidence": "" },
  "deprioritized": { "impact_summary": "", "exposure_shift": "", "confidence": "" }
}
`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 650,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const raw = (textBlock?.text ?? "").trim();

    const unfenced = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const firstBrace = unfenced.indexOf("{");
    const lastBrace = unfenced.lastIndexOf("}");
    const jsonString =
      firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
        ? unfenced.slice(firstBrace, lastBrace + 1)
        : unfenced;

    let projection: Record<string, unknown>;
    try {
      projection = JSON.parse(jsonString) as Record<string, unknown>;
    } catch {
      return res.status(500).json({
        error: "Projection+risk generation failed",
        detail: "Invalid JSON in model response",
      });
    }

    let score = 0;
    const delayed = (projection?.delayed_10_days as Record<string, unknown>)
      ?.confidence as string | undefined;
    const depr = (projection?.deprioritized as Record<string, unknown>)
      ?.confidence as string | undefined;

    if (delayed === "High") score += 20;
    if (delayed === "Medium") score += 12;
    if (depr === "High") score += 25;
    if (depr === "Medium") score += 15;
    if (String(body.exposure_value ?? "").toLowerCase().includes("renewal"))
      score += 10;

    score = Math.min(100, score);
    let indicator = "Green";
    if (score >= 70) indicator = "Red";
    else if (score >= 40) indicator = "Yellow";

    const risk = {
      risk_score: score,
      risk_indicator: indicator,
      risk_reason: "AI projection + deterministic rules",
    };

    const { error: projErr } = await supabase
      .from("decision_projections")
      .insert({
        org_id: body.org_id,
        decision_id: body.decision_id,
        model: "claude-opus-4-6",
        projection,
      });

    if (projErr) {
      return res.status(500).json({
        error: "decision_projections insert failed",
        detail: projErr.message,
      });
    }

    const { error: riskErr } = await supabase.from("decision_risk").upsert({
      org_id: body.org_id,
      decision_id: body.decision_id,
      risk_score: risk.risk_score,
      risk_indicator: risk.risk_indicator,
      risk_reason: risk.risk_reason,
      risk_source: "AI projection + deterministic rules",
      updated_at: new Date().toISOString(),
    });

    if (riskErr) {
      return res.status(500).json({
        error: "decision_risk upsert failed",
        detail: riskErr.message,
      });
    }

    return res.status(200).json({ projection, risk });
  } catch (err: unknown) {
    return res.status(500).json({
      error: "Projection+risk generation failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
