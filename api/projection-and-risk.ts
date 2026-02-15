import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function stripJson(raw: string) {
  const unfenced = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");
  const jsonString =
    firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? unfenced.slice(firstBrace, lastBrace + 1)
      : unfenced;

  return JSON.parse(jsonString);
}

function computeRisk(projection: any, exposureValue: string) {
  let score = 0;

  const delayed = projection?.delayed_10_days?.confidence;
  const depr = projection?.deprioritized?.confidence;

  if (delayed === "High") score += 20;
  if (delayed === "Medium") score += 12;

  if (depr === "High") score += 25;
  if (depr === "Medium") score += 15;

  if (exposureValue?.toLowerCase().includes("renewal")) score += 10;

  score = Math.min(100, score);

  let indicator = "Green";
  if (score >= 70) indicator = "Red";
  else if (score >= 40) indicator = "Yellow";

  return {
    risk_score: score,
    risk_indicator: indicator,
    risk_reason: "AI projection + deterministic rules",
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    const projection = stripJson(textBlock?.text ?? "");

    const risk = computeRisk(projection, body.exposure_value);

    await supabase.from("decision_projections").insert({
      org_id: body.org_id,
      decision_id: body.decision_id,
      model: "claude-opus-4-6",
      projection,
    });

    await supabase.from("decision_risk").upsert({
      org_id: body.org_id,
      decision_id: body.decision_id,
      risk_score: risk.risk_score,
      risk_indicator: risk.risk_indicator,
      risk_reason: risk.risk_reason,
      risk_source: "AI projection + deterministic rules",
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({ projection, risk });
  } catch (err: any) {
    return res.status(500).json({
      error: "Projection+risk generation failed",
      detail: String(err?.message ?? err),
    });
  }
}