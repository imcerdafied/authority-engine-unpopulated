import { useState } from "react";
import { useBulkCreateCapabilityPods } from "@/hooks/useCapabilityPods";
import { useDecisions } from "@/hooks/useOrgData";
import { parseCsvImport } from "@/lib/types";
import type { CapabilityPodStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PodImportProps {
  onClose: () => void;
}

const VALID_STATUSES = new Set(["proposed", "prototyping", "validated", "building", "in_production", "paused"]);

export default function PodImport({ onClose }: PodImportProps) {
  const { data: decisions = [] } = useDecisions();
  const bulkCreate = useBulkCreateCapabilityPods();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseCsvImport> | null>(null);

  const handleParse = () => {
    const result = parseCsvImport(text, decisions.map((d) => ({ id: d.id, title: d.title })));
    setParsed(result);
  };

  const handleImport = async () => {
    if (!parsed) return;
    const valid = parsed.rows.filter((r) => !r.error && r.primary_bet_id);
    const items = valid.map((r) => ({
      name: r.pod_name,
      primary_bet_id: r.primary_bet_id!,
      secondary_bet_id: r.secondary_bet_id,
      owner: r.owner || "Unassigned",
      status: (VALID_STATUSES.has(r.status) ? r.status : "proposed") as CapabilityPodStatus,
      deliverable: r.deliverable || null,
    }));
    try {
      const created = await bulkCreate.mutateAsync(items);
      toast.success(`Created ${created.length} pods`);
      if (parsed.rows.length - valid.length > 0) {
        toast.warning(`${parsed.rows.length - valid.length} rows skipped due to errors`);
      }
      onClose();
    } catch (err) {
      toast.error(`Import failed: ${String(err)}`);
    }
  };

  const validCount = parsed ? parsed.rows.filter((r) => !r.error).length : 0;
  const errorCount = parsed ? parsed.rows.filter((r) => r.error).length : 0;

  return (
    <div className="border rounded-md p-4 mb-4 bg-surface-elevated">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Import Pods</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        Paste pipe or tab-delimited data: <code className="bg-muted px-1 rounded text-[10px]">pod_name | primary_bet | secondary_bet | owner | status | deliverable</code>
      </p>

      <textarea
        rows={6}
        value={text}
        onChange={(e) => { setText(e.target.value); setParsed(null); }}
        placeholder={"Data Platform Migration | Enterprise DPI Bet | | Jane Smith | proposed | Migrate data layer\nAgent SDK | Agent Intelligence Bet | Enterprise DPI Bet | John Doe | prototyping | Ship SDK v2"}
        className="w-full border rounded-sm px-3 py-2 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono resize-y mb-3"
      />

      {!parsed && (
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
        >
          Parse
        </button>
      )}

      {parsed && (
        <>
          <div className="border rounded-md overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-2 py-1.5 font-semibold">Pod</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Primary Bet</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Secondary</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Owner</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Status</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsed.rows.map((r, i) => (
                  <tr key={i} className={cn(r.error && "bg-signal-red/5")}>
                    <td className="px-2 py-1.5">{r.pod_name || "—"}</td>
                    <td className="px-2 py-1.5">{r.primary_bet}</td>
                    <td className="px-2 py-1.5">{r.secondary_bet || "—"}</td>
                    <td className="px-2 py-1.5">{r.owner || "—"}</td>
                    <td className="px-2 py-1.5">{r.status || "proposed"}</td>
                    <td className="px-2 py-1.5">
                      {r.error ? (
                        <span className="text-signal-red font-semibold">{r.error}</span>
                      ) : (
                        <span className="text-signal-green font-semibold">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleImport}
              disabled={validCount === 0 || bulkCreate.isPending}
              className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {bulkCreate.isPending ? "Importing…" : `Import ${validCount} Pods`}
            </button>
            <span className="text-xs text-muted-foreground">
              {validCount} ready · {errorCount} errors
            </span>
          </div>
        </>
      )}
    </div>
  );
}
