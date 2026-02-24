import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { safeBtoaUnicode } from "@/lib/base64";
import type { DecisionComputed } from "@/hooks/useOrgData";

interface Scenario {
  label: string;
  impact_summary: string;
  exposure_shift: string;
  confidence: string;
}

interface ProjectionData {
  scenarios: Scenario[];
  generated_at: string;
  metadata_hash: string;
}

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
  if (s === "scaling") return "High";
  if (s === "piloting") return "Medium";
  if (s === "defined") return "Low";
  if (s === "hypothesis") return "Low";
  if (s === "at_risk") return "Low";
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

function computeHash(d: DecisionComputed): string {
  const category = d.outcome_category || (d as any).outcome_category_key || "";
  const exposure = (d as any).exposure_value || (d as any).revenue_at_risk || "";
  return safeBtoaUnicode(
    `${category}|${d.expected_impact || ""}|${exposure}|${d.outcome_target || ""}|${d.current_delta || ""}`
  );
}

function ConfidenceDot({ level }: { level: string }) {
  const color =
    level === "High" ? "bg-signal-green" :
    level === "Medium" ? "bg-signal-amber" :
    "bg-signal-red";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-1.5 h-1.5 rounded-full", color)} />
      <span className="text-muted-foreground">{level}</span>
    </span>
  );
}

export default function ProjectionPanel({
  decision,
}: {
  decision: DecisionComputed;
}) {
  const [projection, setProjection] = useState<ProjectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);
  const category = decision.outcome_category || (decision as any).outcome_category_key || "";
  const exposure = (decision as any).exposure_value || (decision as any).revenue_at_risk || "";

  const canGenerate = !!(
    category &&
    decision.expected_impact &&
    exposure
  );

  const currentHash = useMemo(() => computeHash(decision), [decision]);
  const isStale = projection ? projection.metadata_hash !== currentHash : false;
  const upsideText = String((decision as any).exposure_value || "");
  const downsideText = String((decision as any).revenue_at_risk || "");
  const upsideValue = extractAmounts(upsideText)[0] ?? null;
  const downsideValue = extractAmounts(downsideText)[0] ?? null;
  const inferredConfidence = (projection?.scenarios?.[0]?.confidence as "Low" | "Medium" | "High" | undefined)
    ?? statusToConfidence(String(decision.status || ""));
  const weight = confidenceWeight(inferredConfidence);
  const expectedNet = upsideValue !== null || downsideValue !== null
    ? (upsideValue ?? 0) * weight - (downsideValue ?? 0) * (1 - weight)
    : null;
  const netAsymmetry = upsideValue !== null || downsideValue !== null
    ? (upsideValue ?? 0) - (downsideValue ?? 0)
    : null;
  const horizonMonths = extractMonths(upsideText, downsideText, String(decision.expected_impact || "")) ?? 24;
  const barBase = Math.max(upsideValue ?? 0, downsideValue ?? 0, 1);
  const upsideBarPct = upsideValue !== null ? Math.max(8, Math.min(100, (upsideValue / barBase) * 100)) : 0;
  const downsideBarPct = downsideValue !== null ? Math.max(8, Math.min(100, (downsideValue / barBase) * 100)) : 0;

  // Load existing projection from DB
  useEffect(() => {
    async function loadExisting() {
      setLoadingExisting(true);
      const { data, error: fetchErr } = await supabase
        .from("decision_projections" as any)
        .select("*")
        .eq("decision_id", decision.id)
        .order("generated_at", { ascending: false })
        .limit(1);

      if (!fetchErr && data && data.length > 0) {
        const row = data[0] as any;
        const raw = row.projection ?? row.scenarios;
        let scenarios: Scenario[];
        if (Array.isArray(raw)) {
          scenarios = raw as Scenario[];
        } else if (raw && typeof raw === "object") {
          scenarios = [
            { label: "On-Time Delivery", impact_summary: raw.on_time?.impact_summary ?? "", exposure_shift: raw.on_time?.exposure_shift ?? "", confidence: raw.on_time?.confidence ?? "" },
            { label: "Delayed by 10 Days", impact_summary: raw.delayed_10_days?.impact_summary ?? "", exposure_shift: raw.delayed_10_days?.exposure_shift ?? "", confidence: raw.delayed_10_days?.confidence ?? "" },
            { label: "Deprioritized", impact_summary: raw.deprioritized?.impact_summary ?? "", exposure_shift: raw.deprioritized?.exposure_shift ?? "", confidence: raw.deprioritized?.confidence ?? "" },
          ];
        } else {
          scenarios = [];
        }
        setProjection({
          scenarios,
          generated_at: row.generated_at ?? row.created_at ?? new Date().toISOString(),
          metadata_hash: row.decision_metadata_hash ?? row.metadata_hash ?? "",
        });
      }
      setLoadingExisting(false);
    }
    loadExisting();
  }, [decision.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in to generate a projection.");
      }

      const payload = {
        decision: {
          id: decision.id,
          org_id: decision.org_id,
        },
      };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const requestProjection = async (token: string) =>
        fetch(`${supabaseUrl}/functions/v1/projection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(payload),
        });

      let res = await requestProjection(accessToken);
      let data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        const refreshedToken = refreshed?.session?.access_token;
        if (refreshErr || !refreshedToken) {
          throw new Error("Session expired. Please sign in again.");
        }
        res = await requestProjection(refreshedToken);
        data = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        throw new Error((data as any)?.error || `Projection failed (${res.status})`);
      }

      if (!data) throw new Error("Projection failed");

      const scenarios: Scenario[] = Array.isArray((data as any).scenarios)
        ? ((data as any).scenarios as Scenario[])
        : (() => {
            const raw = (data as any).projection as Record<string, { impact_summary?: string; exposure_shift?: string; confidence?: string }>;
            return [
              { label: "On-Time Delivery", impact_summary: raw?.on_time?.impact_summary ?? "", exposure_shift: raw?.on_time?.exposure_shift ?? "", confidence: raw?.on_time?.confidence ?? "" },
              { label: "Delayed by 10 Days", impact_summary: raw?.delayed_10_days?.impact_summary ?? "", exposure_shift: raw?.delayed_10_days?.exposure_shift ?? "", confidence: raw?.delayed_10_days?.confidence ?? "" },
              { label: "Deprioritized", impact_summary: raw?.deprioritized?.impact_summary ?? "", exposure_shift: raw?.deprioritized?.exposure_shift ?? "", confidence: raw?.deprioritized?.confidence ?? "" },
            ];
          })();

      setProjection({
        scenarios,
        generated_at: (data as any).generated_at ?? new Date().toISOString(),
        metadata_hash: (data as any).metadata_hash ?? currentHash,
      });
      setShowScenarios(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate projection.");
    } finally {
      setLoading(false);
    }
  };

  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex justify-end gap-2 mb-1 flex-wrap pr-2 md:pr-4">
        {loadingExisting ? null : canGenerate ? (
          <button
            disabled={loading}
            onClick={handleGenerate}
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-sm border transition-colors",
              "border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading
              ? "Modeling scenarios…"
              : projection
              ? isStale
                ? "Remodel Scenarios"
                : "Model Scenarios"
              : "Model Scenarios"}
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <button
                  disabled
                  className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-sm border border-muted text-muted-foreground cursor-not-allowed opacity-50"
                >
                  Model Scenarios
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Requires category, expected impact, and exposure</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="mt-2 border rounded-md p-3 bg-muted/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Projection</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Upside (12-24 mo)</p>
            <p className="font-semibold">{formatMillions(upsideValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Downside (if miss)</p>
            <p className="font-semibold text-signal-red">{formatMillions(downsideValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected Impact (prob-weighted)</p>
            <p className="font-semibold">{expectedNet === null ? "—" : `${expectedNet >= 0 ? "+" : "−"}${formatMillions(Math.abs(expectedNet))} net`}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Based on {Math.round(weight * 100)}% confidence weight</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Time Horizon</p>
              <p className="font-semibold">{horizonMonths} months</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</p>
              <p className="font-semibold">{inferredConfidence} ({String(decision.status || "").replace("_", " ")})</p>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Exposure Asymmetry</p>
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
            Net exposure asymmetry: {netAsymmetry === null ? "—" : `${netAsymmetry >= 0 ? "+" : "−"}${formatMillions(Math.abs(netAsymmetry))}`}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Last updated {new Date((projection?.generated_at ?? decision.updated_at) as string).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {error && (
        <p className="text-[11px] text-signal-red mt-2">{error}</p>
      )}

      {isStale && projection && !loading && (
        <p className="text-[11px] text-signal-amber mt-2">
          Bet metadata has changed since last projection. Consider regenerating.
        </p>
      )}

      {projection && !loading && showScenarios && (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-3">
            {projection.scenarios.map((s) => (
              <div key={s.label} className="border rounded-md p-3">
                <p className={cn(labelClass, "mb-2")}>{s.label}</p>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Impact Summary</span>
                    <p className="font-medium leading-snug">{s.impact_summary}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Exposure Shift</span>
                    <p className="font-semibold">{s.exposure_shift}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Confidence</span>
                    <ConfidenceDot level={s.confidence} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Generated {new Date(projection.generated_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      )}

      {loading && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              <div className="h-3 w-12 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
