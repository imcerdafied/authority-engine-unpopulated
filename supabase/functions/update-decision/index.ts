import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const updates = body?.updates && typeof body.updates === "object" ? body.updates : {};
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing decision id" }), {
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
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const user = authData?.user;
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: decision, error: decisionError } = await serviceClient
      .from("decisions")
      .select("id,org_id,owner_user_id")
      .eq("id", id)
      .maybeSingle();

    if (decisionError || !decision) {
      return new Response(JSON.stringify({ error: "Decision not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership, error: membershipError } = await serviceClient
      .from("organization_memberships")
      .select("role")
      .eq("org_id", decision.org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role = String(membership.role || "");
    const isAdminOrPodLead = role === "admin" || role === "pod_lead";
    const isOwner = decision.owner_user_id && decision.owner_user_id === user.id;

    if (!isAdminOrPodLead) {
      // Owners may only update lifecycle/risk notes through this path.
      const ownerAllowedFields = new Set(["status", "state_changed_at", "state_change_note"]);
      const updateKeys = Object.keys(updates);
      const ownerOnlyUpdate = updateKeys.length > 0 && updateKeys.every((k) => ownerAllowedFields.has(k));
      if (!isOwner || !ownerOnlyUpdate) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: updated, error: updateError } = await serviceClient
      .from("decisions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message || "Update failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
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

