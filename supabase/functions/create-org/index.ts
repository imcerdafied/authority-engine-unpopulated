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

    // Rate-limit org sprawl and keep onboarding predictable.
    const { count: createdCount } = await serviceClient
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id);
    if ((createdCount ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Organization limit reached for this account." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if this creator already has an org with same name (case-insensitive), reuse it.
    const { data: existingOrgs } = await serviceClient
      .from("organizations")
      .select("id,name")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const existing = (existingOrgs || []).find(
      (o: any) => String(o.name || "").trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing?.id) {
      const { data: existingMembership } = await serviceClient
        .from("organization_memberships")
        .select("id")
        .eq("org_id", existing.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existingMembership) {
        await serviceClient
          .from("organization_memberships")
          .insert({ user_id: user.id, org_id: existing.id, role: "admin" });
      }
      return new Response(JSON.stringify({ success: true, orgId: existing.id, reused: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const baseInsertData: Record<string, unknown> = {
      name,
      created_by: user.id,
      allowed_email_domain: null,
    };
    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .insert(baseInsertData)
      .select("id,name")
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
      // Keep data consistent: don't leave orphan orgs with no admin.
      await serviceClient
        .from("organizations")
        .delete()
        .eq("id", org.id)
        .eq("created_by", user.id);
      return new Response(JSON.stringify({ error: membershipError.message || "Failed to create membership" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort optional metadata update for projects that include these columns.
    const optionalUpdate: Record<string, unknown> = {};
    if (productAreas && productAreas.length) optionalUpdate.product_areas = productAreas;
    if (customOutcomeCategories && customOutcomeCategories.length) {
      optionalUpdate.custom_outcome_categories = customOutcomeCategories;
    }
    if (Object.keys(optionalUpdate).length > 0) {
      const { error: optionalError } = await serviceClient
        .from("organizations")
        .update(optionalUpdate)
        .eq("id", org.id);
      if (optionalError) {
        console.warn("Optional org metadata update skipped:", optionalError.message);
      }
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
