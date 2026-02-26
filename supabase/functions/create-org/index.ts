import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const productAreas = Array.isArray(body?.productAreas) ? body.productAreas : null;
    const customOutcomeCategories = Array.isArray(body?.customOutcomeCategories)
      ? body.customOutcomeCategories
      : null;

    if (!name) {
      return new Response(JSON.stringify({ error: "Missing organization name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const insertData: Record<string, unknown> = {
      name,
      created_by: user.id,
      allowed_email_domain: null,
    };
    if (productAreas && productAreas.length) insertData.product_areas = productAreas;
    if (customOutcomeCategories && customOutcomeCategories.length) {
      insertData.custom_outcome_categories = customOutcomeCategories;
    }

    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .insert(insertData)
      .select("id")
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: orgError?.message || "Failed to create organization" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: membershipError } = await serviceClient
      .from("organization_memberships")
      .insert({ user_id: user.id, org_id: org.id, role: "admin" });

    if (membershipError) {
      return new Response(JSON.stringify({ error: membershipError.message || "Failed to create membership" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, orgId: org.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
