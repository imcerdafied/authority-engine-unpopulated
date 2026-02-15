import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const decision = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const required = ["title", "domain", "outcome_category", "expected_impact", "exposure_value"];
    const missing = required.filter((k) => !decision?.[k]);
    if (missing.length) {
      return res.status(400).json({ error: "Missing required fields", missing });
    }

    const prompt = `
You are an enterprise decision analyst.

Task:
Generate three scenario projections for the decision below:
1) On-Time Delivery
2) Delayed by 10 Days
3) Deprioritized

Rules:
- Use only provided fields. Do not invent numbers.
- impact_summary must be <= 35 words.
- exposure_shift describes directionality and scope without fabricating dollars.
- confidence must be one of: Low, Medium, High.

Decision:
Title: ${decision.title}
Surface: ${decision.surface ?? "N/A"}
Domain: ${decision.domain}
Outcome Category: ${decision.outcome_category}
Outcome Target: ${decision.outcome_target ?? "N/A"}
Expected Impact: ${decision.expected_impact}
Exposure Value: ${decision.exposure_value}
Trigger Signal: ${decision.trigger_signal ?? "N/A"}
Revenue at Risk: ${decision.revenue_at_risk ?? "N/A"}

Return JSON exactly:

{
  "on_time": { "impact_summary": "", "exposure_shift": "", "confidence": "" },
  "delayed_10_days": { "impact_summary": "", "exposure_shift": "", "confidence": "" },
  "deprioritized": { "impact_summary": "", "exposure_shift": "", "confidence": "" }
}
`.trim();

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 650,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const text = textBlock?.text ?? "";
    const json = JSON.parse(text);

    return res.status(200).json(json);
  } catch (err: any) {
    return res.status(500).json({
      error: "Projection generation failed",
      detail: String(err?.message ?? err),
    });
  }
}