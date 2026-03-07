import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IncomingFile = {
  name?: string;
  mimeType?: string;
  base64?: string;
};

type SuggestedBet = {
  title: string;
  owner: string;
  product_area: string;
  outcome_target: string | null;
  outcome_category_key: string | null;
  expected_impact: string | null;
  exposure_value: string | null;
  revenue_at_risk: string | null;
  trigger_signal: string;
};

function toGoogleDocTextUrl(urlRaw: string): string {
  const url = new URL(urlRaw);
  if (url.hostname !== "docs.google.com") return urlRaw;
  const parts = url.pathname.split("/");
  const docIdx = parts.indexOf("d");
  const docId = docIdx >= 0 ? parts[docIdx + 1] : "";
  if (!docId) return urlRaw;
  return `https://docs.google.com/document/d/${docId}/export?format=txt`;
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBase64ToString(value: string): string {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function safeParseJsonObject(text: string): Record<string, unknown> {
  const direct = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(direct) as Record<string, unknown>;
  } catch {
    const start = direct.indexOf("{");
    const end = direct.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("No JSON found in model response");
    return JSON.parse(direct.slice(start, end + 1)) as Record<string, unknown>;
  }
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

    const { orgId, sourceText, sourceUrl, file } = await req.json() as {
      orgId?: string;
      sourceText?: string | null;
      sourceUrl?: string | null;
      file?: IncomingFile | null;
    };

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

    const { data: org } = await supabase
      .from("organizations")
      .select("product_areas, custom_outcome_categories")
      .eq("id", orgId)
      .single();

    const warnings: string[] = [];
    let fetchedUrlText = "";
    if (sourceUrl && typeof sourceUrl === "string" && sourceUrl.trim()) {
      try {
        const fetchUrl = toGoogleDocTextUrl(sourceUrl.trim());
        const res = await fetch(fetchUrl, { method: "GET" });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          const body = await res.text();
          fetchedUrlText = /text\/html/i.test(contentType) ? stripHtml(body) : body;
          if (fetchedUrlText.length === 0) warnings.push("URL content was empty after extraction.");
        } else {
          warnings.push("Could not fetch the provided URL. If it is private, paste text directly.");
        }
      } catch {
        warnings.push("URL fetch failed. Paste strategy text or upload a file instead.");
      }
    }

    const textSegments: string[] = [];
    if (sourceText && typeof sourceText === "string" && sourceText.trim()) {
      textSegments.push(sourceText.trim());
    }
    if (fetchedUrlText.trim()) {
      textSegments.push(fetchedUrlText.trim());
    }

    let documentBlock: Record<string, unknown> | null = null;
    if (file?.base64 && typeof file.base64 === "string") {
      const mimeType = String(file.mimeType || "").toLowerCase();
      const fileName = String(file.name || "");
      if (mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
        documentBlock = {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: file.base64,
          },
        };
      } else if (
        mimeType.startsWith("text/") ||
        fileName.toLowerCase().endsWith(".txt") ||
        fileName.toLowerCase().endsWith(".md")
      ) {
        try {
          textSegments.push(decodeBase64ToString(file.base64));
        } catch {
          warnings.push("Text file could not be decoded.");
        }
      } else if (fileName.toLowerCase().endsWith(".docx")) {
        warnings.push("DOCX extraction can be inconsistent. For best results, export as PDF or paste text.");
      } else {
        warnings.push("Unsupported file type. Use PDF, TXT, MD, or pasted text.");
      }
    }

    const mergedText = textSegments.join("\n\n").trim();
    if (!mergedText && !documentBlock) {
      return new Response(JSON.stringify({ error: "No usable strategy input provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productAreas = Array.isArray(org?.product_areas)
      ? org?.product_areas.map((a: any) => String(a?.label || "").trim()).filter(Boolean)
      : [];
    const outcomeCategories = Array.isArray(org?.custom_outcome_categories)
      ? org?.custom_outcome_categories.map((c: any) => ({
          key: String(c?.key || "").trim(),
          label: String(c?.label || "").trim(),
        })).filter((c: any) => c.key && c.label)
      : [];

    const schemaHint = `Return strict JSON only:
{
  "summary": "string",
  "warnings": ["string"],
  "bets": [
    {
      "title": "string",
      "owner": "string",
      "product_area": "string",
      "outcome_target": "string|null",
      "outcome_category_key": "string|null",
      "expected_impact": "string|null",
      "exposure_value": "string|null",
      "revenue_at_risk": "string|null",
      "trigger_signal": "string"
    }
  ]
}`;

    const extractionPrompt = `Extract up to 5 high-impact strategic bets from this source.
Only include bets with clear strategic exposure. If data is missing, keep fields null and add warning entries.
Do not invent people names for owner; if unknown use "TBD".
Product areas should match source language where possible.
Preferred product areas for this org: ${productAreas.length ? productAreas.join(", ") : "none provided"}.
Outcome categories (use key if there is clear fit): ${outcomeCategories.length ? outcomeCategories.map((c: any) => `${c.key}=${c.label}`).join(", ") : "none provided"}.

${schemaHint}`;

    const contentBlocks: Array<Record<string, unknown>> = [
      { type: "text", text: extractionPrompt },
    ];
    if (mergedText) {
      contentBlocks.push({
        type: "text",
        text: `Source text:\n${mergedText.slice(0, 120000)}`,
      });
    }
    if (documentBlock) {
      contentBlocks.push(documentBlock);
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
        max_tokens: 1800,
        messages: [
          {
            role: "user",
            content: contentBlocks,
          },
        ],
      }),
    });
    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Model request failed: ${errText || aiResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiBody = await aiResponse.json();
    const rawText = Array.isArray(aiBody?.content)
      ? aiBody.content.map((c: any) => (c?.type === "text" ? c?.text : "")).join("\n")
      : "";
    const parsed = safeParseJsonObject(rawText);

    const rawBets = Array.isArray(parsed.bets) ? parsed.bets : [];
    const bets: SuggestedBet[] = rawBets
      .map((b: any) => ({
        title: String(b?.title || "").trim(),
        owner: String(b?.owner || "TBD").trim(),
        product_area: String(b?.product_area || "").trim(),
        outcome_target: b?.outcome_target ? String(b.outcome_target).trim() : null,
        outcome_category_key: b?.outcome_category_key ? String(b.outcome_category_key).trim() : null,
        expected_impact: b?.expected_impact ? String(b.expected_impact).trim() : null,
        exposure_value: b?.exposure_value ? String(b.exposure_value).trim() : null,
        revenue_at_risk: b?.revenue_at_risk ? String(b.revenue_at_risk).trim() : null,
        trigger_signal: String(b?.trigger_signal || "").trim(),
      }))
      .filter((b) => b.title.length > 0)
      .slice(0, 5);

    const modelWarnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.map((w) => String(w)).filter(Boolean)
      : [];

    return new Response(
      JSON.stringify({
        summary: typeof parsed.summary === "string" ? parsed.summary : `Extracted ${bets.length} bet candidates.`,
        warnings: [...warnings, ...modelWarnings].slice(0, 10),
        bets,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
