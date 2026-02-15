import { useState } from "react";
import { decisions, signals, pods } from "@/lib/mock-data";
import { daysSince } from "@/lib/types";

const presetQuestions = [
  "What needs attention?",
  "What's blocked?",
  "Which segment is at risk?",
  "What decision is aging?",
];

interface Answer {
  question: string;
  items: { label: string; detail: string }[];
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
          })),
          ...agingDecisions.map((d) => ({
            label: `Aging: ${d.title}`,
            detail: `${daysSince(d.createdDate)} days, owned by ${d.owner}`,
          })),
          ...noOutcome.map((i) => ({
            label: `No outcome: ${i.name}`,
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
          detail: `Blocked for ${daysSince(d.createdDate)} days · Owner: ${d.owner}`,
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
          })),
          ...segmentDecisions.map((d) => ({
            label: `${d.segmentImpact}: ${d.title}`,
            detail: `${d.status} · ${daysSince(d.createdDate)}d old`,
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
          label: `${d.title} (${d.impactTier})`,
          detail: `${daysSince(d.createdDate)} days · ${d.owner}`,
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

      <div className="grid grid-cols-2 gap-2 mb-8">
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
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
