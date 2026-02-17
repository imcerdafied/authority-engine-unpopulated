import { useDecisions, useUpdateDecision, useSignals, usePods, useOverviewMetrics, useDecisionRisks } from "@/hooks/useOrgData";
import StatusBadge from "@/components/StatusBadge";
import RiskChip from "@/components/RiskChip";
import MetricCard from "@/components/MetricCard";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import type { DecisionComputed } from "@/hooks/useOrgData";

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const REQUIRED_FIELDS: { key: keyof DecisionComputed; label: string }[] = [
  { key: "outcome_category", label: "Outcome Category" },
  { key: "expected_impact", label: "Expected Impact" },
  { key: "revenue_at_risk", label: "Exposure (ARR / Renewal / Risk)" },
  { key: "owner", label: "Owner" },
  { key: "outcome_target", label: "Outcome Target" },
];

function parseWorkflowErrors(msg: string): string[] {
  const map: Record<string, string> = {
    HIGH_IMPACT_CAP: "Cannot exceed 5 active high-impact bets.",
    OUTCOME_REQUIRED: "Outcome Target",
    OWNER_REQUIRED: "Owner",
    OUTCOME_CATEGORY_REQUIRED: "Outcome Category",
    EXPECTED_IMPACT_REQUIRED: "Expected Impact",
    EXPOSURE_REQUIRED: "Exposure Value",
  };
  const found: string[] = [];
  for (const [key, label] of Object.entries(map)) {
    if (msg.includes(key)) found.push(label);
  }
  return found;
}

function AuthorityOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 animate-in fade-in duration-300">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 border-2 border-foreground rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-foreground rounded-full" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Authority Mode Active</h1>
        <p className="text-sm text-muted-foreground">Operating constraint engaged. All 5 high-impact slots occupied.</p>
      </div>
    </div>
  );
}

function SeededDecisionsList({
  decisions,
  riskByDecision,
  canWrite,
  updateDecision,
  navigate,
  onAuthorityEngaged,
}: {
  decisions: DecisionComputed[];
  riskByDecision: Record<string, { risk_indicator: "Green" | "Yellow" | "Red" }>;
  canWrite: boolean;
  updateDecision: ReturnType<typeof useUpdateDecision>;
  navigate: ReturnType<typeof useNavigate>;
  onAuthorityEngaged: () => void;
}) {
  const highImpact = decisions.filter((d) => d.impact_tier === "High");
  const activeHighCount = highImpact.filter((d) => d.status !== "closed").length;
  const [expandedFailureId, setExpandedFailureId] = useState<string | null>(null);
  const [failedFields, setFailedFields] = useState<string[]>([]);
  const preActivateCountRef = useRef(activeHighCount);

  // Keep ref in sync
  useEffect(() => {
    preActivateCountRef.current = activeHighCount;
  }, [activeHighCount]);

  const handleActivate = (d: DecisionComputed) => {
    const countBefore = preActivateCountRef.current;
    setExpandedFailureId(null);
    setFailedFields([]);

    updateDecision.mutate(
      { id: d.id, status: "active" as any, activated_at: new Date().toISOString() as any },
      {
        onSuccess: () => {
          const newCount = countBefore + 1;
          const slotsRemaining = 5 - newCount;

          if (newCount >= 5) {
            // 5th slot — trigger overlay
            onAuthorityEngaged();
          } else {
            toast.success(
              `Bet live. Slice clock running. ${slotsRemaining} slot${slotsRemaining !== 1 ? "s" : ""} remaining.`
            );
          }
        },
        onError: (err: any) => {
          const msg = err?.message || String(err);
          const errors = parseWorkflowErrors(msg);

          if (msg.includes("HIGH_IMPACT_CAP")) {
            toast.error("Cannot exceed 5 active high-impact bets.");
            return;
          }

          // Show inline expansion with missing fields
          if (errors.length > 0) {
            setExpandedFailureId(d.id);
            setFailedFields(errors);
          } else {
            // Check fields client-side as fallback
            const missing = REQUIRED_FIELDS
              .filter((f) => !d[f.key])
              .map((f) => f.label);
            if (missing.length > 0) {
              setExpandedFailureId(d.id);
              setFailedFields(missing);
            } else {
              toast.error("Cannot activate. Complete required fields first.");
            }
          }
        },
      }
    );
  };

  return (
    <section className="mb-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Registered Bets ({activeHighCount}/5)
      </h2>
      <div className="border rounded-md divide-y">
        {highImpact.map((d) => {
          const isDraft = d.status === "active" && !d.activated_at;
          const isActive = d.status !== "closed";
          const isExpanded = expandedFailureId === d.id;
          return (
            <div key={d.id}>
              <div
                className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => navigate("/decisions")}
              >
                <div className="flex gap-1.5 shrink-0 items-center">
                  <StatusBadge status={d.solution_domain} />
                  <StatusBadge status={d.impact_tier} />
                  <StatusBadge status={d.status} />
                  <RiskChip indicator={riskByDecision[d.id]?.risk_indicator ?? "Green"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.owner}</p>
                </div>
                {isDraft && canWrite && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleActivate(d); }}
                    disabled={updateDecision.isPending}
                    className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1 rounded-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                  >
                    Activate
                  </button>
                )}
                {isActive && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-signal-green">Active</span>
                )}
              </div>
              {/* Inline validation failure expansion */}
              {isExpanded && failedFields.length > 0 && (
                <div className="px-4 py-3 bg-signal-red/5 border-t border-signal-red/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-signal-red mb-2">
                    Cannot activate — missing required fields
                  </p>
                  <div className="space-y-1">
                    {REQUIRED_FIELDS.map((f) => {
                      const isMissing = failedFields.includes(f.label);
                      const hasValue = !!d[f.key];
                      return (
                        <div key={f.key} className="flex items-center gap-2 text-xs">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            hasValue ? "bg-signal-green" : "bg-signal-red"
                          )} />
                          <span className={cn(
                            hasValue ? "text-muted-foreground" : "text-signal-red font-medium"
                          )}>
                            {f.label}
                          </span>
                          {hasValue && (
                            <span className="text-muted-foreground/60">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate("/decisions"); }}
                    className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1 rounded-sm hover:bg-foreground hover:text-background transition-colors"
                  >
                    Complete Fields →
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {highImpact.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">No high-impact bets registered yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}


function computeBuilderVelocity(pods: any[]) {
  return pods.map((pod: any) => {
    const inits = pod.pod_initiatives || [];
    const shipped = inits.filter((i: any) => i.shipped).length;
    const total = inits.length;
    const withDemo = inits.filter((i: any) => i.last_demo_date);
    const avgCycle = withDemo.length
      ? Math.round(withDemo.reduce((s: number, i: any) => s + daysSince(i.last_demo_date!), 0) / withDemo.length)
      : null;
    const resolved = total ? Math.round((shipped / total) * 100) : 0;
    return { name: pod.name, solutionDomain: pod.solution_domain, shipped, total, avgCycle, resolved };
  });
}

export default function Overview() {
  const [executiveMode, setExecutiveMode] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAuthorityOverlay, setShowAuthorityOverlay] = useState(false);
  const { data: decisions = [], isLoading: dLoading } = useDecisions();
  const { data: risks = [] } = useDecisionRisks();
  const { data: signals = [], isLoading: sLoading } = useSignals();
  const { data: pods = [], isLoading: pLoading } = usePods();
  const { data: metrics, isLoading: mLoading } = useOverviewMetrics();
  const updateDecision = useUpdateDecision();
  const { currentRole } = useOrg();
  const navigate = useNavigate();

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const handleAuthorityEngaged = useCallback(() => {
    setShowAuthorityOverlay(true);
  }, []);

  const handleOverlayDone = useCallback(() => {
    setShowAuthorityOverlay(false);
  }, []);

  if (dLoading || sLoading || pLoading || mLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>;
  }

  const m = metrics || {
    active_high_impact: 0, blocked_gt5_days: 0, unlinked_signals: 0,
    decision_latency_days: 0, overdue_slices: 0, total_active: 0,
    blocked_count: 0, friction_score: 0, friction_level: "Low",
    friction_drivers: [], at_capacity: false,
  };

  const activeHighImpact = decisions.filter((d) => d.status !== "closed" && d.impact_tier === "High");
  const authorityActive = activeHighImpact.length >= 5;

  const activeDecisions = decisions.filter((d) => d.status !== "closed");
  const blockedDecisions = decisions.filter(
    (d) => d.status === "Blocked" && daysSince(d.created_at) > 5
  );
  const unlinkedSignals = signals.filter((s) => !s.decision_id);

  const velocity = computeBuilderVelocity(pods);

  const totalRevenueAtRisk = decisions
    .filter((d) => d.status !== "closed" && d.revenue_at_risk)
    .map((d) => d.revenue_at_risk!)
    .join(" · ");

  const latencyTarget = 7;
  const latencyValue = m.decision_latency_days;
  const latencyDelta = m.total_active ? latencyValue - latencyTarget : null;

  const execAttentionDecisions = decisions.filter((d) => d.needs_exec_attention);

  const validIndicators = ["Green", "Yellow", "Red"] as const;
  const riskByDecision = risks.reduce<Record<string, { risk_indicator: "Green" | "Yellow" | "Red"; risk_score: number }>>(
    (acc, r) => {
      const indicator = validIndicators.includes(r.risk_indicator as any)
        ? (r.risk_indicator as "Green" | "Yellow" | "Red")
        : "Green";
      acc[r.decision_id] = {
        risk_indicator: indicator,
        risk_score: r.risk_score ?? 0,
      };
      return acc;
    },
    {}
  );

  const getRisk = (decisionId: string) =>
    riskByDecision[decisionId] ?? { risk_indicator: "Green" as const, risk_score: 0 };
  const riskCounts = risks.reduce(
    (acc, r) => {
      acc[r.risk_indicator] = (acc[r.risk_indicator] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sliceCompliant = m.total_active > 0 ? m.total_active - m.overdue_slices : 0;
  const slicePercent = m.total_active > 0 ? Math.round((sliceCompliant / m.total_active) * 100) : 100;

  // Authority overlay
  if (showAuthorityOverlay) {
    return <AuthorityOverlay onDone={handleOverlayDone} />;
  }

  // ==================== EXECUTIVE MODE ====================
  if (executiveMode) {
    const hasData = decisions.length > 0 || signals.length > 0;
    const impactTierOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const sortedActiveHighImpact = [...activeHighImpact].sort((a, b) => {
      const scoreA = getRisk(a.id).risk_score;
      const scoreB = getRisk(b.id).risk_score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const tierA = impactTierOrder[a.impact_tier] ?? 0;
      const tierB = impactTierOrder[b.impact_tier] ?? 0;
      if (tierB !== tierA) return tierB - tierA;
      const expA = String((a as { exposure_value?: string }).exposure_value ?? "");
      const expB = String((b as { exposure_value?: string }).exposure_value ?? "");
      return expB.localeCompare(expA);
    });

    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Executive View</h1>
            <p className="text-sm text-muted-foreground mt-1">Board-level operating state</p>
          </div>
          <button
            onClick={() => setExecutiveMode(false)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border px-3 py-1.5 rounded-sm hover:bg-accent transition-colors"
          >
            Full View
          </button>
        </div>

        {!hasData ? (
          <>
            <div className="grid grid-cols-4 gap-3 mb-8">
              <MetricCard label="Active High-Impact" value={`${m.active_high_impact}/5`} sub="Authority Mode Inactive" />
              <MetricCard label="Bet Latency" value="—" sub={`Target: ${latencyTarget}d`} />
              <MetricCard label="Operating Friction" value="—" sub="No active constraints" />
              <MetricCard label="Exec Attention" value="0" sub="No items flagged" />
            </div>
            <div className="border border-dashed rounded-md px-6 py-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">Authority layer not yet activated.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Register high-impact bets to populate executive view.</p>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 mb-8">
              <MetricCard
                label="Active High-Impact"
                value={`${m.active_high_impact}/5`}
                alert={m.at_capacity}
                danger={m.at_capacity}
                sub={authorityActive ? "Authority Mode Active" : `${5 - m.active_high_impact} slots open`}
              />
              <MetricCard
                label="Bet Latency"
                value={m.total_active ? `${latencyValue}d` : "—"}
                alert={latencyDelta !== null && latencyDelta > 0}
                sub={latencyDelta !== null ? `Target: ${latencyTarget}d · Δ ${latencyDelta > 0 ? "+" : ""}${latencyDelta}d` : `Target: ${latencyTarget}d`}
              />
              <MetricCard
                label="Operating Friction"
                value={m.friction_score}
                alert={m.friction_level !== "Low"}
                danger={m.friction_level === "High"}
                sub={m.friction_level}
              />
              <MetricCard
                label="Exec Attention"
                value={execAttentionDecisions.length}
                alert={execAttentionDecisions.length > 0}
                danger={execAttentionDecisions.length > 0}
                sub={execAttentionDecisions.length > 0 ? "Bets flagged" : "No items flagged"}
              />
            </div>

            <div className="mb-8 border rounded-md px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Executive Overview</p>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm bg-signal-red/10 text-signal-red border border-signal-red/30">
                    Red
                  </span>
                  <span className="text-sm font-mono">{riskCounts.Red ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm bg-signal-amber/10 text-signal-amber border border-signal-amber/30">
                    Yellow
                  </span>
                  <span className="text-sm font-mono">{riskCounts.Yellow ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm bg-signal-green/10 text-signal-green border border-signal-green/30">
                    Green
                  </span>
                  <span className="text-sm font-mono">{riskCounts.Green ?? 0}</span>
                </div>
              </div>
            </div>

            {totalRevenueAtRisk && (
              <div className="mb-6 border border-signal-amber/40 bg-signal-amber/5 rounded-md px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">ARR / Renewal Exposure</p>
                <p className="text-sm font-semibold text-signal-amber">{totalRevenueAtRisk}</p>
              </div>
            )}

            {m.friction_drivers.length > 0 && (
              <div className={cn(
                "mb-6 border rounded-md px-4 py-3",
                m.friction_level === "High" ? "border-signal-red/40 bg-signal-red/5" :
                m.friction_level === "Moderate" ? "border-signal-amber/40 bg-signal-amber/5" : ""
              )}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Friction Drivers</p>
                <div className="space-y-1">
                  {m.friction_drivers.map((d, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {d}</p>
                  ))}
                </div>
              </div>
            )}

            <section className="mb-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Active High-Impact Bets
              </h2>
              {sortedActiveHighImpact.length > 0 ? (
                <div className="border rounded-md divide-y">
                  {sortedActiveHighImpact.map((d) => {
                    const age = daysSince(d.created_at);
                    const exceeded = age > (d.slice_deadline_days || 10);
                    return (
                      <div key={d.id} className={cn("px-4 py-4", exceeded && "bg-signal-red/5")}>
                        <div className="flex items-center gap-3 mb-2">
                          <StatusBadge status={d.solution_domain} />
                          <StatusBadge status={d.impact_tier} />
                          {d.decision_health && <StatusBadge status={d.decision_health} />}
                          <RiskChip indicator={getRisk(d.id).risk_indicator} />
                          {exceeded && (
                            <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider">
                              Exceeded {d.slice_deadline_days || 10}d window
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold">{d.title}</h3>
                        <div className="flex gap-6 text-xs text-muted-foreground mt-1">
                          <span>{d.owner}</span>
                          <span className="text-mono">{age}d old</span>
                          {d.revenue_at_risk && <span className="text-signal-amber font-semibold">{d.revenue_at_risk}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed rounded-md px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No active high-impact bets.</p>
                </div>
              )}
            </section>

            {execAttentionDecisions.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Bets Requiring Executive Attention
                </h2>
                <div className="border border-signal-red/30 rounded-md bg-signal-red/5 divide-y divide-signal-red/10">
                  {execAttentionDecisions.map((d) => {
                    const age = d.age_days ?? daysSince(d.created_at);
                    return (
                      <div key={d.id} className="px-4 py-3">
                        <div className="flex items-center gap-3 mb-1">
                          <StatusBadge status={d.solution_domain} />
                          <StatusBadge status={d.status} />
                          <span className="text-sm font-medium flex-1">{d.title}</span>
                          <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider">
                            {age}d — Attention Required
                          </span>
                        </div>
                        {d.blocked_reason && <p className="text-xs text-muted-foreground">{d.blocked_reason}</p>}
                        {d.blocked_dependency_owner && (
                          <p className="text-xs text-muted-foreground">Dependency: {d.blocked_dependency_owner}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  // ==================== STATE 1: SEEDING MODE ====================
  if (!authorityActive) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Executive Overview</h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">
              {m.active_high_impact}/5 Active · {5 - m.active_high_impact} slots remaining
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {canWrite && (
          <div className="mb-8">
            <button
              onClick={() => setShowRegister(true)}
              className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors"
            >
              + Register Bet
            </button>
          </div>
        )}

        {showRegister && (
          <CreateDecisionForm onClose={() => setShowRegister(false)} />
        )}

        <SeededDecisionsList
          decisions={decisions}
          riskByDecision={riskByDecision}
          canWrite={canWrite}
          updateDecision={updateDecision}
          navigate={navigate}
          onAuthorityEngaged={handleAuthorityEngaged}
        />

        {blockedDecisions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Blocked — Escalation Required</h2>
            <div className="border border-signal-red/30 rounded-md bg-signal-red/5 divide-y divide-signal-red/10">
              {blockedDecisions.map((d) => {
                const age = d.age_days ?? daysSince(d.created_at);
                return (
                  <div key={d.id} className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-1">
                      <StatusBadge status={d.solution_domain} />
                      <StatusBadge status="Blocked" />
                      <p className="text-sm font-medium flex-1">{d.title}</p>
                      <span className="text-xs text-mono font-semibold text-signal-red">{age}d</span>
                    </div>
                    {d.blocked_reason && <p className="text-xs text-muted-foreground mt-1">{d.blocked_reason}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {unlinkedSignals.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Signals Awaiting Authority</h2>
              <Link to="/signals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
            </div>
            <div className="border rounded-md divide-y">
              {unlinkedSignals.slice(0, 5).map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-4">
                  {s.solution_domain && <StatusBadge status={s.solution_domain} />}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32 shrink-0">{s.type}</span>
                  <p className="text-sm flex-1">{s.description}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{daysSince(s.created_at)}d ago</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ==================== STATE 2: OPERATING MODE ====================
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Executive Overview</h1>
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-foreground/10 text-foreground">
            5/5 Active · At capacity
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {showRegister && (
        <CreateDecisionForm onClose={() => setShowRegister(false)} />
      )}

      {activeDecisions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Bets</h2>
            <Link to="/decisions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
          </div>
          <div className="border rounded-md divide-y">
            {activeDecisions.slice(0, 5).map((d) => {
              const sliceRemaining = d.slice_remaining ?? 0;
              const exceeded = d.is_exceeded ?? false;
              const urgent = d.is_urgent ?? false;
              return (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate("/decisions")}
                  onKeyDown={(e) => e.key === "Enter" && navigate("/decisions")}
                  className={cn("px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors", exceeded && "bg-signal-red/5")}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1.5 shrink-0">
                      <StatusBadge status={d.solution_domain} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                        <span>{d.owner}</span>
                        <span>{d.surface}</span>
                        {d.revenue_at_risk && <span className="text-signal-amber font-semibold">{d.revenue_at_risk}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-semibold text-mono",
                        exceeded ? "text-signal-red" : urgent ? "text-signal-amber" : ""
                      )}>
                        {exceeded ? `${Math.abs(sliceRemaining)}d over` : `${sliceRemaining}d left`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {exceeded ? `Exceeded ${d.slice_deadline_days || 10}d window` : "slice clock"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {blockedDecisions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Blocked — Escalation Required</h2>
          <div className="border border-signal-red/30 rounded-md bg-signal-red/5 divide-y divide-signal-red/10">
            {blockedDecisions.map((d) => {
              const age = d.age_days ?? daysSince(d.created_at);
              return (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-1">
                    <StatusBadge status={d.solution_domain} />
                    <StatusBadge status="Blocked" />
                    <p className="text-sm font-medium flex-1">{d.title}</p>
                    <span className="text-xs text-mono font-semibold text-signal-red">{age}d</span>
                    {d.needs_exec_attention && (
                      <span className="text-[11px] font-semibold text-signal-red uppercase tracking-wider">Exec Attention</span>
                    )}
                  </div>
                  {d.blocked_reason && <p className="text-xs text-muted-foreground mt-1">{d.blocked_reason}</p>}
                  {d.blocked_dependency_owner && (
                    <p className="text-xs text-muted-foreground">Dependency: {d.blocked_dependency_owner}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {unlinkedSignals.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Signals Awaiting Authority</h2>
            <Link to="/signals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
          </div>
          {unlinkedSignals.length > 3 && (
            <div className="mb-3 border border-signal-amber/40 bg-signal-amber/5 rounded-md px-4 py-2">
              <p className="text-xs font-semibold text-signal-amber">
                {unlinkedSignals.length} signals without bets — inaction is visible
              </p>
            </div>
          )}
          <div className={cn("border rounded-md divide-y", unlinkedSignals.length > 3 && "border-signal-amber/30")}>
            {unlinkedSignals.slice(0, 5).map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-4">
                {s.solution_domain && <StatusBadge status={s.solution_domain} />}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32 shrink-0">{s.type}</span>
                <p className="text-sm flex-1">{s.description}</p>
                <span className="text-xs text-muted-foreground shrink-0">{daysSince(s.created_at)}d ago</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {velocity.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Builder Velocity — Last 14 Days</h2>
          <div className="border rounded-md divide-y">
            {velocity.map((v) => {
              const zeroVelocity = v.shipped === 0;
              return (
                <div key={v.name} className={cn("px-4 py-3", zeroVelocity && "bg-signal-amber/5")}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={v.solutionDomain} />
                      <p className="text-sm font-semibold">{v.name}</p>
                    </div>
                    {zeroVelocity && (
                      <span className="text-[11px] font-semibold text-signal-amber uppercase tracking-wider">Zero velocity</span>
                    )}
                  </div>
                  <div className="flex gap-6 text-xs text-muted-foreground">
                    <span>Shipped: <span className="font-semibold text-foreground text-mono">{v.shipped}/{v.total}</span></span>
                    <span>Resolved: <span className="font-semibold text-foreground text-mono">{v.resolved}%</span></span>
                    {v.avgCycle !== null && (
                      <span>Avg cycle: <span className="font-semibold text-foreground text-mono">{v.avgCycle}d</span></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
