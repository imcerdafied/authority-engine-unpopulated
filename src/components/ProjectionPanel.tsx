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
  const category = decision.outcome_category || (decision as any).outcome_category_key || "";
  const exposure = (decision as any).exposure_value || (decision as any).revenue_at_risk || "";

  const canGenerate = !!(
    category &&
    decision.expected_impact &&
    exposure
  );

  const currentHash = useMemo(() => computeHash(decision), [decision]);
  const isStale = projection ? projection.metadata_hash !== currentHash : false;

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
      const payload = {
        decision: {
          id: decision.id,
          org_id: decision.org_id,
        },
      };

      let data: any = null;
      let lastErrorMessage = "Projection failed";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const { data: edgeData, error: invokeErr } = await supabase.functions.invoke("projection", {
          body: payload,
        });
        if (!invokeErr) {
          data = edgeData;
          break;
        }
        lastErrorMessage = invokeErr.message || "Projection failed";
        const isTransportFailure = lastErrorMessage.includes("Failed to send a request to the Edge Function");
        if (!isTransportFailure || attempt === 1) {
          throw new Error(
            isTransportFailure
              ? "Projection service is temporarily unreachable. Please retry in a few seconds."
              : lastErrorMessage
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 350));
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
              "border-foreground text-foreground hover:bg-foreground hover:text-background",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading
              ? "Generating projection…"
              : projection
              ? isStale
                ? "Regenerate Projection"
                : "Regenerate"
              : "Generate Projection"}
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <button
                  disabled
                  className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-sm border border-muted text-muted-foreground cursor-not-allowed opacity-50"
                >
                  Generate Projection
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Requires category, expected impact, and exposure value</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-signal-red mt-2">{error}</p>
      )}

      {isStale && projection && !loading && (
        <p className="text-[11px] text-signal-amber mt-2">
          Bet metadata has changed since last projection. Consider regenerating.
        </p>
      )}

      {projection && !loading && (
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
