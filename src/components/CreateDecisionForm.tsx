import { useState, useEffect } from "react";
import { useCreateDecision } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import type { TablesInsert } from "@/integrations/supabase/types";
import { fetchOutcomeCategories, type OutcomeCategoryItem } from "@/lib/taxonomy";

type SolutionDomain = Database["public"]["Enums"]["solution_domain"];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CreateDecisionForm({ onClose, navigateAfter = false }: { onClose: () => void; navigateAfter?: boolean }) {
  const createDecision = useCreateDecision();
  const { currentOrg, currentRole, productAreas, customOutcomeCategories } = useOrg();

  const domainLabels: Record<string, string> = Object.fromEntries(
    productAreas.map((pa) => [pa.key, pa.label]),
  );
  const domainKeys = productAreas.map((pa) => pa.key) as SolutionDomain[];
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = currentRole === "admin" || currentRole === "pod_lead";

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [productArea, setProductArea] = useState("");
  const [outcomeTarget, setOutcomeTarget] = useState("");
  const [outcomeCategories, setOutcomeCategories] = useState<OutcomeCategoryItem[]>([]);
  const [outcomeCategoryKey, setOutcomeCategoryKey] = useState("");
  const [outcomeCategoriesError, setOutcomeCategoriesError] = useState<string | null>(null);
  const [expectedImpact, setExpectedImpact] = useState("");
  const [exposureValue, setExposureValue] = useState("");
  const [strategyText, setStrategyText] = useState("");
  const [strategyUrl, setStrategyUrl] = useState("");
  const [strategyFile, setStrategyFile] = useState<File | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyWarnings, setStrategyWarnings] = useState<string[]>([]);
  const [strategySummary, setStrategySummary] = useState("");
  const [strategySuggestions, setStrategySuggestions] = useState<Array<{
    title: string;
    owner: string;
    product_area: string;
    outcome_target: string | null;
    outcome_category_key: string | null;
    expected_impact: string | null;
    exposure_value: string | null;
    revenue_at_risk: string | null;
    trigger_signal: string;
  }>>([]);

  useEffect(() => {
    if (customOutcomeCategories) {
      setOutcomeCategories(customOutcomeCategories.map((c) => ({ key: c.key, label: c.label })));
    } else {
      fetchOutcomeCategories()
        .then(setOutcomeCategories)
        .catch((err) => {
          console.error("Failed to fetch outcome categories:", err);
          setOutcomeCategoriesError("Could not load categories");
        });
    }
  }, [customOutcomeCategories]);
  const [triggerSignal, setTriggerSignal] = useState("");
  const [revenueAtRisk, setRevenueAtRisk] = useState("");

  useEffect(() => {
    if (!productArea && productAreas.length > 0) {
      setProductArea(productAreas[0].label);
    }
  }, [productArea, productAreas]);

  if (!canCreate) return null;

  const resolveSolutionDomain = (labelRaw: string): SolutionDomain => {
    const label = labelRaw.trim().toLowerCase();
    const exact = productAreas.find((pa) => pa.label.trim().toLowerCase() === label);
    if (exact) return exact.key as SolutionDomain;
    if (domainKeys.length > 0) return domainKeys[0];
    return "Cross";
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || "");
        const comma = raw.indexOf(",");
        resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
      };
      reader.onerror = () => reject(new Error("Failed reading file"));
      reader.readAsDataURL(file);
    });

  const readFunctionError = async (error: unknown) => {
    const maybe = error as { message?: string; context?: unknown };
    if (maybe?.context instanceof Response) {
      try {
        const body = await maybe.context.clone().json();
        if (body && typeof body.error === "string" && body.error.trim()) {
          return body.error.trim();
        }
      } catch {
        // Ignore JSON parse failures and fall through.
      }
      try {
        const text = await maybe.context.clone().text();
        if (text.trim()) {
          return text.trim();
        }
      } catch {
        // Ignore text parse failures and fall through.
      }
    }
    if (typeof maybe?.message === "string" && maybe.message.trim()) {
      return maybe.message.trim();
    }
    return "Strategy mapping failed.";
  };

  const getAccessTokenWithRetry = async () => {
    for (let i = 0; i < 6; i += 1) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) return token;
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) return refreshed.session.access_token;
      await sleep(250);
    }
    return null;
  };

  const invokeMapStrategyBets = async (body: {
    orgId: string;
    sourceText: string | null;
    sourceUrl: string | null;
    file: { name: string; mimeType: string; base64: string } | null;
  }) => {
    const firstAttempt = await supabase.functions.invoke("map-strategy-bets", { body });
    if (!firstAttempt.error) return firstAttempt.data;

    const firstError = firstAttempt.error;
    const firstMessage = String((firstError as { message?: string } | null)?.message || "");
    const isAuthError = /invalid jwt|401|unauthorized|forbidden/i.test(firstMessage);
    if (!isAuthError) {
      throw firstError;
    }

    const accessToken = await getAccessTokenWithRetry();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
      throw new Error("Session is not valid for strategy import. Please sign out and sign in again.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/map-strategy-bets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        typeof responseBody?.error === "string"
          ? responseBody.error
          : typeof responseBody?.message === "string"
            ? responseBody.message
            : `HTTP ${response.status}`;
      throw new Error(detail);
    }
    return responseBody;
  };

  const mapOutcomeCategory = (candidate: string | null | undefined) => {
    if (!candidate) return "";
    const normalized = candidate.trim().toLowerCase();
    const exact = outcomeCategories.find((c) => c.key.toLowerCase() === normalized || c.label.toLowerCase() === normalized);
    return exact?.key ?? "";
  };

  const analyzeStrategy = async () => {
    if (!currentOrg?.id) return;
    if (!strategyText.trim() && !strategyUrl.trim() && !strategyFile) {
      toast.error("Provide strategy text, a link, or a file.");
      return;
    }

    setStrategyLoading(true);
    setStrategyWarnings([]);
    setStrategySummary("");
    setStrategySuggestions([]);

    try {
      const userInputWarnings: string[] = [];
      const normalizedSourceTextSegments: string[] = [];
      if (strategyText.trim()) {
        normalizedSourceTextSegments.push(strategyText.trim());
      }

      const normalizedUrlInput = strategyUrl.trim();
      let normalizedSourceUrl: string | null = null;
      if (normalizedUrlInput) {
        if (/^https?:\/\/\S+$/i.test(normalizedUrlInput)) {
          normalizedSourceUrl = normalizedUrlInput;
        } else {
          normalizedSourceTextSegments.push(normalizedUrlInput);
          userInputWarnings.push("URL field content was treated as strategy text because it was not a valid URL.");
        }
      }

      let filePayload:
        | {
            name: string;
            mimeType: string;
            base64: string;
          }
        | undefined;
      if (strategyFile) {
        const lowerName = strategyFile.name.toLowerCase();
        const mime = (strategyFile.type || "").toLowerCase();
        const isTextFile = mime.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".md");
        if (isTextFile) {
          const strategyFileText = (await strategyFile.text()).trim();
          if (strategyFileText) {
            normalizedSourceTextSegments.push(strategyFileText);
          } else {
            userInputWarnings.push("Selected text file was empty.");
          }
        } else {
          filePayload = {
            name: strategyFile.name,
            mimeType: strategyFile.type || "application/octet-stream",
            base64: await fileToBase64(strategyFile),
          };
        }
      }

      const normalizedSourceText = normalizedSourceTextSegments.join("\n\n").trim();
      if (!normalizedSourceText && !normalizedSourceUrl && !filePayload) {
        toast.error("No usable strategy content detected. Paste text, provide a valid URL, or choose a non-empty file.");
        setStrategyWarnings(userInputWarnings);
        return;
      }

      const data = await invokeMapStrategyBets({
        orgId: currentOrg.id,
        sourceText: normalizedSourceText || null,
        sourceUrl: normalizedSourceUrl,
        file: filePayload || null,
      });

      const incoming = Array.isArray(data?.bets) ? data.bets : [];
      const suggestions = incoming
        .filter((b: any) => b && typeof b.title === "string")
        .map((b: any) => ({
          title: String(b.title || "").trim(),
          owner: String(b.owner || "").trim(),
          product_area: String(b.product_area || "").trim(),
          outcome_target: b.outcome_target ? String(b.outcome_target) : null,
          outcome_category_key: b.outcome_category_key ? String(b.outcome_category_key) : null,
          expected_impact: b.expected_impact ? String(b.expected_impact) : null,
          exposure_value: b.exposure_value ? String(b.exposure_value) : null,
          revenue_at_risk: b.revenue_at_risk ? String(b.revenue_at_risk) : null,
          trigger_signal: String(b.trigger_signal || "").trim(),
        }))
        .filter((b) => b.title.length > 0);
      setStrategySuggestions(suggestions);
      const modelWarnings = Array.isArray(data?.warnings) ? data.warnings.map((w: any) => String(w)) : [];
      setStrategyWarnings([...userInputWarnings, ...modelWarnings]);
      setStrategySummary(typeof data?.summary === "string" ? data.summary : "");
      if (suggestions.length === 0) {
        toast.error("No clear bet candidates found. Try a cleaner strategy source.");
      } else {
        toast.success(`Mapped ${suggestions.length} bet candidate${suggestions.length === 1 ? "" : "s"}.`);
      }
    } catch (err: unknown) {
      console.error("Strategy mapping failed:", err);
      const message = await readFunctionError(err);
      if (/invalid jwt|unauthorized|forbidden|session/i.test(message.toLowerCase())) {
        toast.error("Strategy mapping failed.", {
          description: "Your session expired for edge function access. Sign out, sign back in, then retry.",
        });
        return;
      }
      toast.error("Strategy mapping failed.", { description: message });
    } finally {
      setStrategyLoading(false);
    }
  };

  const applySuggestionToForm = (s: {
    title: string;
    owner: string;
    product_area: string;
    outcome_target: string | null;
    outcome_category_key: string | null;
    expected_impact: string | null;
    exposure_value: string | null;
    revenue_at_risk: string | null;
    trigger_signal: string;
  }) => {
    setTitle(s.title);
    setOwner(s.owner);
    setProductArea(s.product_area || productAreas[0]?.label || "");
    setOutcomeTarget(s.outcome_target || "");
    setOutcomeCategoryKey(mapOutcomeCategory(s.outcome_category_key));
    setExpectedImpact(s.expected_impact || "");
    setExposureValue(s.exposure_value || "");
    setRevenueAtRisk(s.revenue_at_risk || "");
    setTriggerSignal(s.trigger_signal || "");
  };

  const createAllSuggestions = async () => {
    if (!strategySuggestions.length) return;
    const normalizedSponsor = sponsor.trim();
    if (!normalizedSponsor) {
      toast.error("Sponsor is required before creating suggestions.");
      return;
    }
    let created = 0;
    for (const s of strategySuggestions) {
      if (!s.title || !s.owner || !s.trigger_signal) continue;
      const solutionDomain = resolveSolutionDomain(s.product_area);
      const mappedCategory = mapOutcomeCategory(s.outcome_category_key) || outcomeCategories[0]?.key || null;
      await createDecision.mutateAsync({
        title: s.title,
        owner: s.owner,
        sponsor: normalizedSponsor,
        owner_user_id: user?.id ?? null,
        surface: s.product_area || domainLabels[solutionDomain] || solutionDomain,
        solution_domain: solutionDomain,
        impact_tier: "High",
        status: "defined",
        risk_level: "healthy",
        outcome_target: s.outcome_target || null,
        outcome_category_key: mappedCategory,
        expected_impact: s.expected_impact || null,
        exposure_value: s.exposure_value || null,
        trigger_signal: s.trigger_signal || null,
        revenue_at_risk: s.revenue_at_risk || null,
      } as any);
      created += 1;
    }
    if (created === 0) {
      toast.error("No complete suggestions to create.");
      return;
    }
    toast.success(`Created ${created} draft bet${created === 1 ? "" : "s"}.`);
    onClose();
    if (navigateAfter) navigate("/decisions");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedTitle = title.trim();
    const normalizedOwner = owner.trim();
    const normalizedSponsor = sponsor.trim();
    const normalizedProductArea = productArea.trim();
    const normalizedTriggerSignal = triggerSignal.trim();

    if (!normalizedTitle || !normalizedOwner || !normalizedSponsor || !normalizedProductArea || !normalizedTriggerSignal) {
      toast.error("Title, owner, sponsor, product area, and trigger signal are required.");
      return;
    }
    if (!outcomeCategoryKey) {
      toast.error("Outcome category is required.");
      return;
    }

    try {
      const solutionDomain = resolveSolutionDomain(normalizedProductArea);
      const payload: Omit<TablesInsert<"decisions">, "org_id" | "created_by"> = {
        title: normalizedTitle,
        owner: normalizedOwner,
        sponsor: normalizedSponsor,
        owner_user_id: user?.id ?? null,
        surface: normalizedProductArea,
        solution_domain: solutionDomain,
        impact_tier: "High",
        status: "defined",
        risk_level: "healthy",
        outcome_target: outcomeTarget || null,
        outcome_category_key: outcomeCategoryKey || null,
        expected_impact: expectedImpact || null,
        exposure_value: exposureValue || null,
        trigger_signal: normalizedTriggerSignal,
        revenue_at_risk: revenueAtRisk || null,
      };

      await createDecision.mutateAsync(payload);

      toast.success(`Draft created — "${normalizedTitle}"`, {
        description: "Complete required fields to activate.",
        action: {
          label: "View bet",
          onClick: () => navigate("/decisions"),
        },
      });
      onClose();
      if (navigateAfter) {
        navigate("/decisions");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("HIGH_IMPACT_CAP")) {
        toast.error("Cannot register bet: all high-impact slots are full. Close one first.");
        return;
      }
      if (message.includes("decision_status")) {
        toast.error("Cannot register bet due to status configuration mismatch. Refresh and retry.");
        return;
      }
      toast.error("Failed to register bet.", {
        description: message,
      });
    }
  };

  return (
    <div className="border rounded-md p-5 mb-6 bg-surface-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Register High-Impact Bet</h2>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <div className="border rounded-sm p-3 mb-4 bg-background">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bulk Strategy Import (Beta)</p>
        <p className="text-[11px] text-muted-foreground mb-2">
          Import one strategy source to map multiple bets, then create all mapped drafts at once.
        </p>
        <div className="space-y-2">
          <textarea
            value={strategyText}
            onChange={(e) => setStrategyText(e.target.value)}
            rows={4}
            placeholder="Paste strategy text, memo excerpt, or planning notes (optional if using URL/file)"
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <input
            type="url"
            value={strategyUrl}
            onChange={(e) => setStrategyUrl(e.target.value)}
            placeholder="Optional source URL (Google Doc/public page)"
            className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <input
            type="file"
            accept=".txt,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setStrategyFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-muted-foreground"
          />
          <p className="text-[10px] text-muted-foreground">
            File upload is for batch mapping only, not for attaching to a single bet.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={analyzeStrategy}
              disabled={strategyLoading}
              className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {strategyLoading ? "Analyzing..." : "Map Strategy"}
            </button>
            {strategySuggestions.length > 0 && (
              <button
                type="button"
                onClick={createAllSuggestions}
                disabled={createDecision.isPending}
                className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-3 py-1.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {createDecision.isPending ? "Creating..." : `Create ${strategySuggestions.length} Draft${strategySuggestions.length === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
          {strategySummary && <p className="text-xs text-muted-foreground">{strategySummary}</p>}
          {strategyWarnings.length > 0 && (
            <div className="text-[11px] text-signal-amber space-y-0.5">
              {strategyWarnings.map((w, i) => <p key={`${w}-${i}`}>• {w}</p>)}
            </div>
          )}
          {strategySuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mapped Draft Bets
              </p>
              {strategySuggestions.map((s, i) => (
                <div key={`${s.title}-${i}`} className="border rounded-sm p-2">
                  <p className="text-xs font-semibold">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{s.owner || "Owner missing"} · {s.product_area || "Product area missing"}</p>
                  {s.expected_impact && <p className="text-[11px] text-muted-foreground mt-1">{s.expected_impact}</p>}
                  <button
                    type="button"
                    onClick={() => applySuggestionToForm(s)}
                    className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Use In Form
                  </button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">
                Sponsor from the manual form below will be applied to all created drafts.
              </p>
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Title *</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Owner *</label>
            <input required value={owner} onChange={(e) => setOwner(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Sponsor *</label>
            <input required value={sponsor} onChange={(e) => setSponsor(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Product Area *</label>
            <input
              required
              list="org-product-area-options"
              value={productArea}
              onChange={(e) => setProductArea(e.target.value)}
              placeholder="Type product area (e.g. Registry Growth)"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <datalist id="org-product-area-options">
              {productAreas.map((pa) => (
                <option key={pa.key} value={pa.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Outcome Category</label>
            <select value={outcomeCategoryKey} onChange={(e) => setOutcomeCategoryKey(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground">
              <option value="" disabled>Select…</option>
              {outcomeCategories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            {outcomeCategoriesError && (
              <p className="text-[10px] text-signal-amber mt-0.5">{outcomeCategoriesError}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Outcome Target</label>
            <input value={outcomeTarget} onChange={(e) => setOutcomeTarget(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Expected Impact</label>
            <input value={expectedImpact} onChange={(e) => setExpectedImpact(e.target.value)} placeholder="e.g. +15% adoption"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Exposure Value</label>
            <input value={exposureValue} onChange={(e) => setExposureValue(e.target.value)} placeholder="e.g. $2.1M ARR at risk"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Revenue at Risk</label>
            <input value={revenueAtRisk} onChange={(e) => setRevenueAtRisk(e.target.value)} placeholder="$4.8M ARR"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Trigger Signal *</label>
            <input required value={triggerSignal} onChange={(e) => setTriggerSignal(e.target.value)}
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={createDecision.isPending || !outcomeCategoryKey}
            className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {createDecision.isPending ? "Registering..." : "Register Bet"}
          </button>
        </div>
      </form>
    </div>
  );
}
