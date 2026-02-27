import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-reminder-secret",
};

const lifecycleLabels: Record<string, string> = {
  defined: "Defined",
  activated: "Activated",
  proving_value: "Proving Value",
  scaling: "Scaling",
  durable: "Durable",
  closed: "Closed",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("REMINDER_CRON_SECRET");
    const providedSecret = req.headers.get("x-reminder-secret");
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Query active decisions with assigned owners
    const { data: decisions, error } = await supabase
      .from("decisions")
      .select("id, title, status, owner, owner_user_id, exposure_value, revenue_at_risk, updated_at, org_id")
      .neq("status", "closed")
      .not("owner_user_id", "is", null);

    if (error) {
      console.error("Failed to fetch decisions:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!decisions || decisions.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: "No active decisions with owners" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get unique owner user_ids and fetch their profiles
    const ownerIds = [...new Set(decisions.map((d) => d.owner_user_id).filter(Boolean))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", ownerIds);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p]),
    );

    // Group decisions by owner
    const byOwner: Record<string, typeof decisions> = {};
    for (const d of decisions) {
      if (!d.owner_user_id) continue;
      if (!byOwner[d.owner_user_id]) byOwner[d.owner_user_id] = [];
      byOwner[d.owner_user_id].push(d);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const [ownerId, ownerBets] of Object.entries(byOwner)) {
      const profile = profileMap.get(ownerId);
      if (!profile?.email) continue;

      const betRows = ownerBets
        .map((b) => {
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(b.updated_at).getTime()) / (1000 * 60 * 60 * 24),
          );
          const statusLabel = lifecycleLabels[String(b.status ?? "").toLowerCase()] ?? "Defined";
          const exposure = b.exposure_value || b.revenue_at_risk || "\u2014";
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500;">${b.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${statusLabel}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${daysSinceUpdate}d ago</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${exposure}</td>
          </tr>`;
        })
        .join("");

      const displayName = profile.display_name || "there";

      const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="font-size:18px;font-weight:600;margin-bottom:4px;">Weekly Bet Status Reminder</h2>
  <p style="color:#666;font-size:14px;">Hi ${displayName},</p>
  <p style="color:#666;font-size:14px;">Here are your active bets. Please review and update their status:</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#666;">Bet</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#666;">Status</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#666;">Last Updated</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#666;">Exposure</th>
      </tr>
    </thead>
    <tbody>${betRows}</tbody>
  </table>
  <a href="https://buildauthorityos.com/decisions" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-size:13px;font-weight:500;margin-top:8px;">Review Your Bets</a>
  <p style="color:#999;font-size:12px;margin-top:24px;">\u2014 Build Authority</p>
</body>
</html>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Build Authority <noreply@buildauthorityos.com>",
            to: [profile.email],
            subject: `Weekly Bet Reminder \u2014 ${ownerBets.length} active bet${ownerBets.length > 1 ? "s" : ""}`,
            html,
          }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          errors.push(`Failed for ${profile.email}: ${errBody}`);
        } else {
          sent++;
        }
      } catch (err) {
        errors.push(`Error for ${profile.email}: ${String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Weekly reminder error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
