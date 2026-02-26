import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONVIVA_ORG_ID = "aa6d6ba6-5e88-4c61-a511-234a8cea4c12";
const CONVIVA_ADMIN_EMAILS = new Set([
  "aganjam@conviva.ai",
  "aganjam@conviva.com",
  "hwu@conviva.ai",
  "hwu@conviva.com",
  "hzhang@conviva.ai",
  "hzhang@conviva.com",
  "jzhan@conviva.ai",
  "jzhan@conviva.com",
  "kzubchevich@conviva.ai",
  "kzubchevich@conviva.com",
  "pkohli@conviva.ai",
  "pkohli@conviva.com",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orgId } = (await req.json()) as { orgId: string };
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "Missing orgId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orgId)) {
      return new Response(
        JSON.stringify({ error: "Invalid organization ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: orgData } = await serviceClient
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .maybeSingle();

    if (!orgData) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await serviceClient
      .from("organization_memberships")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, alreadyMember: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = String(user.email ?? "").trim().toLowerCase();
    const role =
      orgId === CONVIVA_ORG_ID && CONVIVA_ADMIN_EMAILS.has(normalizedEmail)
        ? "admin"
        : "viewer";

    const { error: insertError } = await serviceClient
      .from("organization_memberships")
      .insert({ user_id: user.id, org_id: orgId, role });

    if (insertError) {
      console.error("Join org error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to join organization" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Join org error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
