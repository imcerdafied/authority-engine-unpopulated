import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const results: string[] = [];

    // Export each table
    for (const table of ["decisions", "signals", "pods", "pod_initiatives", "closed_decisions", "decision_events"]) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.error(`Error fetching ${table}:`, error.message);
        continue;
      }
      if (!data?.length) continue;

      const csv = toCsv(data);
      const path = `${stamp}/${table}.csv`;
      const { error: uploadError } = await supabase.storage
        .from("data-backups")
        .upload(path, new Blob([csv], { type: "text/csv" }), {
          contentType: "text/csv",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for ${table}:`, uploadError.message);
      } else {
        results.push(path);
      }
    }

    return new Response(JSON.stringify({ ok: true, files: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backup failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
