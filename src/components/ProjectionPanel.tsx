import type { DecisionComputed } from "@/hooks/useOrgData";
import { cn } from "@/lib/utils";

function extractAmounts(text: string): number[] {
  const matches = text.match(/\$[\d,.]+(?:\s*-\s*\$?[\d,.]+)?\s*[kmb]?/gi) || [];
  return matches.flatMap((m) => {
    const raw = m.toLowerCase().replace(/\s/g, "");
    const [a, b] = raw.replace("$", "").split("-");
    const parseOne = (v: string): number | null => {
      const cleaned = v.replace("$", "");
      const unit = cleaned.slice(-1);
      const base = parseFloat(cleaned.replace(/[kmb]/, "").replace(/,/g, ""));
      if (!Number.isFinite(base)) return null;
      if (unit === "b") return base * 1000;
      if (unit === "m") return base;
      if (unit === "k") return base / 1000;
      return base;
    };
    const first = parseOne(a);
    const second = b ? parseOne(b) : null;
    const vals = [first, second].filter((x): x is number => typeof x === "number");
    if (vals.length === 2) return [(vals[0] + vals[1]) / 2];
    return vals;
  });
}

function extractMonths(...texts: string[]): number | null {
  for (const t of texts) {
    const m = t.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*months?/i);
    if (!m) continue;
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.max(a, b);
  }
  return null;
}

function statusToConfidence(status: string): "Low" | "Medium" | "High" {
  const s = (status || "").toLowerCase();
  if (s === "durable") return "High";
  if (s === "scaling") return "High";
  if (s === "proving_value") return "Medium";
  if (s === "activated") return "Medium";
  if (s === "defined") return "Low";
  if (s === "closed") return "Low";
  return "Medium";
}

function confidenceWeight(conf: "Low" | "Medium" | "High"): number {
  if (conf === "High") return 0.75;
  if (conf === "Low") return 0.35;
  return 0.55;
}

function formatMillions(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `$${v.toFixed(v >= 10 ? 0 : 1)}M`;
}

export default function ProjectionPanel({
  decision,
}: {
  decision: DecisionComputed;
}) {
  const upsideText = String((decision as any).exposure_value || "");
  const downsideText = String((decision as any).revenue_at_risk || "");
  const expectedImpactText = String((decision as any).expected_impact || "");
  const upsideAmounts = extractAmounts(upsideText);
  const upsideValue = upsideAmounts[0] ?? null;
  const downsideValue = extractAmounts(downsideText)[0] ?? null;
  const installedBaseCandidates = [
    ...upsideAmounts,
    ...extractAmounts(expectedImpactText),
  ].filter((v) => Number.isFinite(v) && v > (upsideValue ?? 0));
  const installedBaseInfluenced = installedBaseCandidates.length > 0 ? Math.max(...installedBaseCandidates) : null;
  const inferredConfidence = statusToConfidence(String(decision.status || ""));
  const weight = confidenceWeight(inferredConfidence);
  const expectedNet = upsideValue !== null || downsideValue !== null
    ? (upsideValue ?? 0) * weight - (downsideValue ?? 0) * (1 - weight)
    : null;
  const netAsymmetry = upsideValue !== null || downsideValue !== null
    ? (upsideValue ?? 0) - (downsideValue ?? 0)
    : null;
  const horizonMonths = extractMonths(upsideText, downsideText, String(decision.expected_impact || "")) ?? 24;
  const probabilitySuccess = Math.round(weight * 100);
  const breakEvenProbability = upsideValue !== null && downsideValue !== null && upsideValue + downsideValue > 0
    ? Math.round((downsideValue / (upsideValue + downsideValue)) * 1000) / 10
    : null;
  const failureProbability = 100 - probabilitySuccess;
  const expectedValueLabel = expectedNet === null ? "—" : `${expectedNet >= 0 ? "+" : "−"}${formatMillions(Math.abs(expectedNet))}`;
  const barBase = Math.max(upsideValue ?? 0, downsideValue ?? 0, 1);
  const upsideBarPct = upsideValue !== null ? Math.max(8, Math.min(100, (upsideValue / barBase) * 100)) : 0;
  const downsideBarPct = downsideValue !== null ? Math.max(8, Math.min(100, (downsideValue / barBase) * 100)) : 0;

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="mt-2 border rounded-md p-3 bg-muted/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Authority vs Monitoring: {horizonMonths}-Month Exposure
        </p>
        <p className="text-xs text-muted-foreground">
          Existential positioning in the AI era: become the decision authority layer, or remain a monitoring surface.
        </p>

        <div className="mt-3 rounded-lg border bg-background/70 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Renewal Exposure at Risk</p>
          <p className="text-4xl md:text-5xl font-semibold leading-none mt-1 text-signal-red">
            {downsideValue === null ? "—" : `−${formatMillions(Math.abs(downsideValue))}`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Installed Base Influenced</p>
              <p className="text-xl font-semibold">
                {installedBaseInfluenced === null ? "—" : formatMillions(installedBaseInfluenced)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expansion Opportunity</p>
              <p className="text-xl font-semibold text-signal-green">
                {upsideValue === null ? "—" : `+${formatMillions(Math.abs(upsideValue))}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="border rounded-sm bg-background/70 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Defensive Value (Renewal Protection)</p>
            <p className="text-sm font-medium mt-1">
              Protects renewal gravity by embedding Conviva in AI evaluation and governance workflows.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              If we fail to embed, renewal erosion risk rises and category authority weakens.
            </p>
          </div>
          <div className="border rounded-sm bg-background/70 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Offensive Value (Expansion & Positioning)</p>
            <p className="text-sm font-medium mt-1">
              Converts Conviva into the system of record for scale/change/stop decisions on enterprise AI agents.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drives expansion by coupling outcome authority with revenue-critical workflows.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          This is structural positioning, not incremental feature ROI.
        </p>

        <div className="mt-3 border rounded-sm bg-background/70 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Weighting Model</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Probability of Success</p>
              <p className="font-semibold">{probabilitySuccess}% ({inferredConfidence})</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Break-even Probability</p>
              <p className="font-semibold">{breakEvenProbability === null ? "—" : `${breakEvenProbability}%`}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected Value ({horizonMonths} mo)</p>
              <p className={cn("font-semibold", expectedNet !== null && expectedNet < 0 ? "text-signal-red" : "")}>{expectedValueLabel}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <p>
              Expected Value = (Upside × P(success)) − (Downside × P(failure))
            </p>
            <p>
              = ({upsideValue === null ? "—" : `+${formatMillions(Math.abs(upsideValue))}`} × {probabilitySuccess}%)
              {" "}− ({downsideValue === null ? "—" : `${formatMillions(Math.abs(downsideValue))}`} × {failureProbability}%)
              {expectedNet === null ? "" : ` = ${expectedValueLabel}`}
            </p>
          </div>
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk-Reward Imbalance (Raw)</p>
            <div className="border rounded-sm px-2 py-1.5 bg-background/70">
              <div className="flex items-center h-4">
                <div className="w-1/2 flex justify-end pr-1">
                  {downsideBarPct > 0 && (
                    <div className="h-2 rounded-l bg-signal-red/70" style={{ width: `${downsideBarPct}%` }} />
                  )}
                </div>
                <div className="w-px h-3 bg-border mx-0.5" />
                <div className="w-1/2 flex pl-1">
                  {upsideBarPct > 0 && (
                    <div className="h-2 rounded-r bg-signal-green/70" style={{ width: `${upsideBarPct}%` }} />
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Risk: {downsideValue === null ? "—" : `−${formatMillions(Math.abs(downsideValue))}`}</span>
                <span>0</span>
                <span>Opportunity: {upsideValue === null ? "—" : `+${formatMillions(Math.abs(upsideValue))}`}</span>
              </div>
            </div>
            <p className="text-xs mt-1">
              {netAsymmetry === null ? "—" : `${netAsymmetry >= 0 ? "+" : "−"}${formatMillions(Math.abs(netAsymmetry))}`}
            </p>
          </div>
        </div>

        <div className="mt-3 border rounded-sm bg-background/70 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Interpretation</p>
          <p className="text-sm mt-1">
            This bet carries high strategic leverage with asymmetrical exposure. The decision is whether to accept current risk shape
            or deliberately change it.
          </p>
          <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>Increase probability of success through tighter execution and adoption evidence.</li>
            <li>Increase upside leverage by widening authority-linked expansion pathways.</li>
            <li>Reduce renewal exposure by lowering dependency on miss scenarios.</li>
          </ul>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Last updated {new Date(decision.updated_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
