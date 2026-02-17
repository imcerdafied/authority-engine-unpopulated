import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useDecisions } from "@/hooks/useOrgData";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

const fieldLabels: Record<string, string> = {
  title: "Title",
  trigger_signal: "Trigger Signal",
  outcome_target: "Outcome Target",
  expected_impact: "Expected Impact",
  exposure_value: "Exposure",
  current_delta: "Current Delta",
  revenue_at_risk: "Enterprise Exposure",
  owner: "Owner",
  status: "Status",
};

function relativeTime(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getWeekRange(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function Review() {
  const { currentOrg } = useOrg();
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { data: allActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["all_activity", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("decision_activity" as any)
        .select("*")
        .eq("org_id", currentOrg.id)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!currentOrg,
  });

  if (decisionsLoading || activityLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).getTime();

  const activeDecisions = decisions.filter((d) => (d.status as string)?.toLowerCase() !== "closed");

  const activityByDecision = allActivity.reduce<Record<string, any[]>>((acc, a) => {
    if (!acc[a.decision_id]) acc[a.decision_id] = [];
    acc[a.decision_id].push(a);
    return acc;
  }, {});

  const movedCount = activeDecisions.filter((d) => {
    const acts = activityByDecision[d.id] || [];
    return acts.some((a) => new Date(a.created_at).getTime() >= weekAgo);
  }).length;

  const stagnantCount = activeDecisions.filter((d) => {
    const acts = activityByDecision[d.id] || [];
    return !acts.some((a) => new Date(a.created_at).getTime() >= weekAgo);
  }).length;

  const stateChangedAtValues = activeDecisions.map((d) => {
    const stateAt = (d as any).state_changed_at;
    if (stateAt) return (Date.now() - new Date(stateAt).getTime()) / (1000 * 60 * 60 * 24);
    const statusActs = (activityByDecision[d.id] || []).filter((a: any) => a.field_name === "status");
    if (statusActs.length > 0) {
      const latest = statusActs[0];
      return (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24);
    }
    return (Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  });

  const avgDaysInState =
    stateChangedAtValues.length > 0
      ? stateChangedAtValues.reduce((a, b) => a + b, 0) / stateChangedAtValues.length
      : 0;

  const exposureChanges = allActivity.filter(
    (a: any) => (a.field_name === "exposure_value" || a.field_name === "revenue_at_risk") && new Date(a.created_at).getTime() >= weekAgo
  );

  const decisionsWithActivity = activeDecisions
    .map((d) => ({
      decision: d,
      activityCount: (activityByDecision[d.id] || []).length,
      lastActivity: (activityByDecision[d.id] || [])[0]?.created_at,
    }))
    .sort((a, b) => b.activityCount - a.activityCount);

  const movedClass =
    movedCount / Math.max(1, activeDecisions.length) > 0.5
      ? "text-signal-green"
      : movedCount / Math.max(1, activeDecisions.length) > 0.25
        ? "text-signal-amber"
        : "text-signal-red";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold">Weekly Review</h1>
        <p className="text-sm text-muted-foreground mt-1">{getWeekRange()}</p>
      </div>

      <div className="bg-muted/30 border rounded-lg p-5 mb-8">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Bets Moved</p>
            <p className={cn("text-2xl font-bold", movedClass)}>
              {movedCount}/{activeDecisions.length}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Stagnant</p>
            <p className={cn("text-2xl font-bold", stagnantCount > 0 && "text-signal-red")}>{stagnantCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Avg Days in State</p>
            <p
              className={cn(
                "text-2xl font-bold",
                avgDaysInState > 21 ? "text-signal-red" : avgDaysInState > 14 ? "text-signal-amber" : ""
              )}
            >
              {avgDaysInState.toFixed(1)}d
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Per-Bet Breakdown</h2>
        <div className="space-y-3">
          {decisionsWithActivity.map(({ decision: d, activityCount, lastActivity }) => {
            const acts = activityByDecision[d.id] || [];
            const lastActTime = lastActivity ? new Date(lastActivity).getTime() : 0;
            const dotClass =
              lastActTime >= threeDaysAgo
                ? "bg-signal-green"
                : lastActTime >= weekAgo
                  ? "bg-signal-amber"
                  : "bg-signal-red";
            const statusChangeInWeek = acts.find((a: any) => a.field_name === "status" && new Date(a.created_at).getTime() >= weekAgo);
            const stateChangeNote = (d as any).state_change_note;
            const capacityAllocated = (d as any).capacity_allocated ?? 0;
            const capacityDiverted = (d as any).capacity_diverted ?? 0;
            const hasOperational = capacityAllocated > 0 || capacityDiverted > 0;

            return (
              <div key={d.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", dotClass)} />
                  <StatusBadge status={d.solution_domain} />
                  <p className="font-medium text-sm truncate max-w-[60ch]" title={d.title}>
                  {(d.title ?? "").length > 60 ? `${(d.title ?? "").slice(0, 60)}…` : (d.title ?? "")}
                </p>
                </div>
                <p className={cn("text-sm mt-1", statusChangeInWeek ? "font-medium" : "text-signal-red")}>
                  {statusChangeInWeek
                    ? `${statusChangeInWeek.old_value ?? "—"} → ${statusChangeInWeek.new_value ?? "—"}`
                    : "No movement"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activityCount} field updates · Last: {lastActivity ? relativeTime(lastActivity) : "—"}
                </p>
                {stateChangeNote && (
                  <p className="text-[12px] text-muted-foreground italic mt-2">— {stateChangeNote}</p>
                )}
                {hasOperational && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Capacity: {capacityAllocated}% · Diverted: {capacityDiverted}%
                  </p>
                )}
              </div>
            );
          })}
          {decisionsWithActivity.length === 0 && (
            <p className="text-muted-foreground">No active bets.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Exposure Changes</h2>
        {exposureChanges.length === 0 ? (
          <p className="text-muted-foreground italic">No exposure changes this week</p>
        ) : (
          <div className="space-y-2">
            {exposureChanges.map((a: any) => {
              const bet = decisions.find((d) => d.id === a.decision_id);
              return (
                <div key={a.id} className="text-sm border rounded p-2">
                  <p className="font-medium">{bet?.title ?? "Unknown bet"}</p>
                  <p className="text-muted-foreground">{a.old_value ?? "—"} → {a.new_value ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{relativeTime(a.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">All Activity</h2>
        {allActivity.length === 0 ? (
          <p className="text-muted-foreground italic">No activity this week</p>
        ) : (
          <div className="space-y-2">
            {allActivity.map((a: any) => {
              const bet = decisions.find((d) => d.id === a.decision_id);
              const label = fieldLabels[a.field_name] ?? a.field_name;
              return (
                <div key={a.id} className="text-sm border rounded p-2">
                  <p className="text-[10px] text-muted-foreground">{relativeTime(a.created_at)}</p>
                  <p className="font-medium text-[12px]">{bet?.title ?? "Unknown bet"}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {label} → {a.old_value ?? "—"} → {a.new_value ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
