import { useState } from "react";
import { useDecisions, useSignals, usePods } from "@/hooks/useOrgData";
import StatusBadge from "@/components/StatusBadge";
import { formatBetLifecycleStatus, isClosedBetLifecycle, toBetRiskLevel } from "@/lib/bet-status";

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const presetQuestions = [
  "What needs attention?",
  "What's blocked?",
  "Which segment is at risk?",
  "What bet is aging?",
  "Where is legacy gravity?",
  "What renewal exposure exists?",
];

interface Answer {
  question: string;
  items: { label: string; detail: string; solution?: string }[];
}

function computeAnswer(question: string, decisions: any[], signals: any[], pods: any[]): Answer {
  switch (question) {
    case "What needs attention?": {
      const unlinkedSignals = signals.filter((s: any) => !s.decision_id);
      const agingDecisions = decisions.filter(
        (d: any) => !isClosedBetLifecycle(d.status) && daysSince(d.created_at) > 7
      );
      const noOutcome = pods
        .flatMap((p: any) => p.pod_initiatives || [])
        .filter((i: any) => !i.outcome_linked);
      return {
        question,
        items: [
          ...unlinkedSignals.map((s: any) => ({ label: `Signal: ${s.type}`, detail: s.description, solution: s.solution_domain })),
          ...agingDecisions.map((d: any) => ({ label: `Aging: ${d.title}`, detail: `${daysSince(d.created_at)} days, owned by ${d.owner}`, solution: d.solution_domain })),
          ...noOutcome.map((i: any) => ({ label: `Unbound: ${i.name}`, detail: `Owner: ${i.owner}` })),
        ],
      };
    }
    case "What's blocked?": {
      const blocked = decisions.filter((d: any) => toBetRiskLevel(d.risk_level) === "at_risk");
      return {
        question,
        items: blocked.map((d: any) => ({
          label: d.title,
          detail: `Blocked for ${daysSince(d.created_at)} days · ${d.blocked_reason || "No reason specified"} · Dependency: ${d.blocked_dependency_owner || "Unknown"}`,
          solution: d.solution_domain,
        })),
      };
    }
    case "Which segment is at risk?": {
      const segmentDecisions = decisions.filter((d: any) => d.segment_impact && !isClosedBetLifecycle(d.status));
      const segmentSignals = signals.filter((s: any) => s.type === "Segment Variance");
      return {
        question,
        items: [
          ...segmentSignals.map((s: any) => ({ label: `Signal: ${s.type}`, detail: s.description, solution: s.solution_domain })),
          ...segmentDecisions.map((d: any) => ({
            label: `${d.segment_impact}: ${d.title}`,
            detail: `${formatBetLifecycleStatus(d.status)} · ${daysSince(d.created_at)}d old · ${d.revenue_at_risk || "No exposure quantified"}`,
            solution: d.solution_domain,
          })),
        ],
      };
    }
    case "What bet is aging?": {
      const aging = decisions
        .filter((d: any) => !isClosedBetLifecycle(d.status))
        .sort((a: any, b: any) => daysSince(b.created_at) - daysSince(a.created_at));
      return {
        question,
        items: aging.map((d: any) => ({
          label: d.title,
          detail: `${daysSince(d.created_at)} days · ${d.owner} · ${d.surface} · ${d.decision_health || "Unknown health"}`,
          solution: d.solution_domain,
        })),
      };
    }
    case "Where is legacy gravity?": {
      const s1Decisions = decisions.filter((d: any) => d.solution_domain === "S1" && !isClosedBetLifecycle(d.status));
      const s1Inits = pods.filter((p: any) => p.solution_domain === "S1").flatMap((p: any) => p.pod_initiatives || []).filter((i: any) => !i.shipped);
      return {
        question,
        items: [
          ...s1Decisions.map((d: any) => ({ label: `S1 Bet: ${d.title}`, detail: `${daysSince(d.created_at)}d old · ${d.owner} · ${d.revenue_at_risk || ""}`, solution: "S1" })),
          ...s1Inits.map((i: any) => ({ label: `S1 Initiative: ${i.name}`, detail: `Owner: ${i.owner} · Not shipped`, solution: "S1" })),
          ...(s1Decisions.length === 0 && s1Inits.length === 0
            ? [{ label: "No legacy gravity detected", detail: "S1 attention is within normal bounds" }]
            : []),
        ],
      };
    }
    case "What renewal exposure exists?": {
      const renewalDecisions = decisions.filter((d: any) => d.revenue_at_risk && !isClosedBetLifecycle(d.status));
      return {
        question,
        items: renewalDecisions.map((d: any) => ({
          label: d.title,
          detail: `${d.revenue_at_risk} · ${d.owner} · ${d.surface} · ${d.decision_health || "Unknown"}`,
          solution: d.solution_domain,
        })),
      };
    }
    default:
      return { question, items: [] };
  }
}

export default function Ask() {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const { data: decisions = [] } = useDecisions();
  const { data: signals = [] } = useSignals();
  const { data: pods = [] } = usePods();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Ask</h1>
        <p className="text-sm text-muted-foreground mt-1">Query the operating layer</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        {presetQuestions.map((q) => (
          <button
            key={q}
            onClick={() => setAnswer(computeAnswer(q, decisions, signals, pods))}
            className={`text-left border rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-accent ${
              answer?.question === q ? "bg-accent border-foreground/20" : ""
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {answer && (
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {answer.question}
          </h2>
          {answer.items.length === 0 ? (
            <div className="border border-dashed rounded-md px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No data available. Register decisions and signals to activate queries.</p>
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {answer.items.map((item, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    {item.solution && <StatusBadge status={item.solution} />}
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
