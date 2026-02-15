import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
  return btoa(
    `${d.outcome_category || ""}|${d.expected_impact || ""}|${(d as any).exposure_value || ""}|${d.outcome_target || ""}|${d.current_delta || ""}`
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

export default function ProjectionPanel({ decision }: { decision: DecisionComputed }) {
  const [projection, setProjection] = useState<ProjectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  const canGenerate = !!(
    decision.outcome_category &&
    decision.expected_impact &&
    (decision as any).exposure_value
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
        setProjection({
          scenarios: row.scenarios as Scenario[],
          generated_at: row.generated_at,
          metadata_hash: row.decision_metadata_hash,
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
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke("projection", {
        body: { decision: { ...decision, exposure_value: (decision as any).exposure_value } },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.error) {
        throw new Error(response.error.message || "Projection failed");
      }

      const result = response.data as ProjectionData;
      setProjection(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate projection.");
    } finally {
      setLoading(false);
    }
  };

  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider">AI Impact Projection</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Scenario modeling based on structured decision metadata.
          </p>
        </div>
        {loadingExisting ? null : (
          <button
            disabled={!canGenerate || loading}
            onClick={handleGenerate}
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors",
              canGenerate
                ? "border-foreground text-foreground hover:bg-foreground hover:text-background"
                : "border-muted text-muted-foreground cursor-not-allowed opacity-50"
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
        )}
      </div>

      {!canGenerate && (
        <p className="text-[11px] text-signal-amber mt-2">
          Projection requires outcome category, expected impact, and exposure value.
        </p>
      )}

      {error && (
        <p className="text-[11px] text-signal-red mt-2">{error}</p>
      )}

      {isStale && projection && !loading && (
        <p className="text-[11px] text-signal-amber mt-2">
          Decision metadata has changed since last projection. Consider regenerating.
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
