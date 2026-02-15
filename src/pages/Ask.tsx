import { useState } from "react";
import { decisions, signals, pods } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const presetQuestions = [
  "What needs attention?",
  "What's blocked?",
  "Which segment is at risk?",
  "What decision is aging?",
  "Where is legacy gravity?",
  "What renewal exposure exists?",
];

interface Answer {
  question: string;
  items: { label: string; detail: string; solution?: string }[];
}

function computeAnswer(question: string): Answer {
  switch (question) {
    case "What needs attention?": {
      const unlinkedSignals = signals.filter((s) => !s.decisionId);
      const agingDecisions = decisions.filter(
        (d) => d.status === "Active" && daysSince(d.createdDate) > 7
      );
      const noOutcome = pods
        .flatMap((p) => p.initiatives)
        .filter((i) => !i.outcomeLinked);
      return {
        question,
        items: [
          ...unlinkedSignals.map((s) => ({
            label: `Signal: ${s.type}`,
            detail: s.description,
            solution: s.solutionType,
          })),
          ...agingDecisions.map((d) => ({
            label: `Aging: ${d.title}`,
            detail: `${daysSince(d.createdDate)} days, owned by ${d.owner}`,
            solution: d.solutionType,
          })),
          ...noOutcome.map((i) => ({
            label: `Unbound: ${i.name}`,
            detail: `Owner: ${i.owner}`,
          })),
        ],
      };
    }
    case "What's blocked?": {
      const blocked = decisions.filter((d) => d.status === "Blocked");
      return {
        question,
        items: blocked.map((d) => ({
          label: d.title,
          detail: `Blocked for ${daysSince(d.createdDate)} days · ${d.blockedReason || "No reason specified"} · Dependency: ${d.blockedDependencyOwner || "Unknown"}`,
          solution: d.solutionType,
        })),
      };
    }
    case "Which segment is at risk?": {
      const segmentDecisions = decisions.filter(
        (d) => d.segmentImpact && d.status !== "Closed"
      );
      const segmentSignals = signals.filter(
        (s) => s.type === "Segment Variance"
      );
      return {
        question,
        items: [
          ...segmentSignals.map((s) => ({
            label: `Signal: ${s.type}`,
            detail: s.description,
            solution: s.solutionType,
          })),
          ...segmentDecisions.map((d) => ({
            label: `${d.segmentImpact}: ${d.title}`,
            detail: `${d.status} · ${daysSince(d.createdDate)}d old · ${d.revenueAtRisk || "No exposure quantified"}`,
            solution: d.solutionType,
          })),
        ],
      };
    }
    case "What decision is aging?": {
      const aging = decisions
        .filter((d) => d.status === "Active")
        .sort((a, b) => daysSince(b.createdDate) - daysSince(a.createdDate));
      return {
        question,
        items: aging.map((d) => ({
          label: `${d.title}`,
          detail: `${daysSince(d.createdDate)} days · ${d.owner} · ${d.surface} · ${d.decisionHealth || "Unknown health"}`,
          solution: d.solutionType,
        })),
      };
    }
    case "Where is legacy gravity?": {
      const s1Decisions = decisions.filter((d) => d.solutionType === "S1" && d.status === "Active");
      const s1Inits = pods.filter((p) => p.solutionType === "S1").flatMap((p) => p.initiatives).filter((i) => !i.shipped);
      return {
        question,
        items: [
          ...s1Decisions.map((d) => ({
            label: `S1 Decision: ${d.title}`,
            detail: `${daysSince(d.createdDate)}d old · ${d.owner} · ${d.revenueAtRisk || ""}`,
            solution: "S1",
          })),
          ...s1Inits.map((i) => ({
            label: `S1 Initiative: ${i.name}`,
            detail: `Owner: ${i.owner} · Not shipped`,
            solution: "S1",
          })),
          ...(s1Decisions.length === 0 && s1Inits.length === 0
            ? [{ label: "No legacy gravity detected", detail: "S1 attention is within normal bounds" }]
            : []),
        ],
      };
    }
    case "What renewal exposure exists?": {
      const renewalDecisions = decisions.filter(
        (d) => d.revenueAtRisk && d.status !== "Closed"
      );
      return {
        question,
        items: renewalDecisions.map((d) => ({
          label: d.title,
          detail: `${d.revenueAtRisk} · ${d.owner} · ${d.surface} · ${d.decisionHealth || "Unknown"}`,
          solution: d.solutionType,
        })),
      };
    }
    default:
      return { question, items: [] };
  }
}

export default function Ask() {
  const [answer, setAnswer] = useState<Answer | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Ask</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Query the operating layer
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        {presetQuestions.map((q) => (
          <button
            key={q}
            onClick={() => setAnswer(computeAnswer(q))}
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
            <p className="text-sm text-muted-foreground">Nothing found.</p>
          ) : (
            <div className="border rounded-md divide-y">
              {answer.items.map((item, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    {item.solution && <StatusBadge status={item.solution} />}
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
