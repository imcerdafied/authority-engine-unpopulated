import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const now = new Date();
const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

const [{ data: events, error: eventsError }, { data: decisions, error: decisionsError }] = await Promise.all([
  supabase
    .from("product_events")
    .select("org_id,event_name,severity,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000),
  supabase
    .from("decisions")
    .select("org_id,status,updated_at")
    .order("updated_at", { ascending: false })
    .limit(5000),
]);

if (eventsError) {
  console.error(`Failed to load product events: ${eventsError.message}`);
  process.exit(1);
}
if (decisionsError) {
  console.error(`Failed to load decisions: ${decisionsError.message}`);
  process.exit(1);
}

const eventRows = events || [];
const decisionRows = decisions || [];

const eventCounts = new Map();
const errorCountsByOrg = new Map();

for (const row of eventRows) {
  eventCounts.set(row.event_name, (eventCounts.get(row.event_name) || 0) + 1);
  if (row.severity === "error") {
    const key = row.org_id || "unknown_org";
    errorCountsByOrg.set(key, (errorCountsByOrg.get(key) || 0) + 1);
  }
}

const activeDecisionsByOrg = new Map();
for (const row of decisionRows) {
  if ((row.status || "").toLowerCase() === "closed") continue;
  const key = row.org_id || "unknown_org";
  activeDecisionsByOrg.set(key, (activeDecisionsByOrg.get(key) || 0) + 1);
}

const topEvents = [...eventCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

const errorOrgs = [...errorCountsByOrg.entries()].sort((a, b) => b[1] - a[1]);
const activeOrgs = [...activeDecisionsByOrg.entries()].sort((a, b) => b[1] - a[1]);

const report = `# QA and Monitoring Report

Generated: ${now.toISOString()}
Window: last 24 hours (since ${since})

## Event Volume

Total events: ${eventRows.length}
Error events: ${eventRows.filter((e) => e.severity === "error").length}

### Top Events
${topEvents.length === 0 ? "- None" : topEvents.map(([name, count]) => `- ${name}: ${count}`).join("\n")}

## Reliability Hotspots (by org)
${errorOrgs.length === 0 ? "- No error events logged." : errorOrgs.map(([orgId, count]) => `- ${orgId}: ${count} error event(s)`).join("\n")}

## Active Bet Footprint (by org)
${activeOrgs.length === 0 ? "- No active bets found." : activeOrgs.map(([orgId, count]) => `- ${orgId}: ${count} active bet(s)`).join("\n")}

## Suggested Follow-ups
- Investigate orgs with highest error counts and identify repeated failing flows.
- Correlate decision_status_changed vs decision_updated to measure owner/admin operating cadence.
- Add alert thresholds on error events for invite_join_failed and decision_status_changed failures.
`;

const outDir = path.join(process.cwd(), "reports");
const outPath = path.join(outDir, "qa-monitor-latest.md");
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, report, "utf8");

console.log(`Wrote ${outPath}`);
