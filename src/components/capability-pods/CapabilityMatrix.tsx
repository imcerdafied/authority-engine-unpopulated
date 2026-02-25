import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { CapabilityPod } from "@/lib/types";
import type { DecisionComputed } from "@/hooks/useOrgData";

interface CapabilityMatrixProps {
  pods: CapabilityPod[];
  bets: DecisionComputed[];
  onPodClick: (podId: string) => void;
}

export default function CapabilityMatrix({ pods, bets, onPodClick }: CapabilityMatrixProps) {
  if (pods.length === 0) {
    return (
      <div className="border border-dashed rounded-md px-6 py-10 text-center">
        <p className="text-sm font-medium text-muted-foreground">No capability pods registered.</p>
        <p className="text-xs text-muted-foreground/70 mt-1.5">Register pods from the Bets page or use the button above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/30 min-w-[200px]">
              Pod
            </th>
            <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[80px]">
              Status
            </th>
            <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[100px]">
              Owner
            </th>
            {bets.map((bet) => (
              <th
                key={bet.id}
                className="text-center px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[100px] max-w-[150px]"
              >
                <span className="block truncate" title={bet.title}>{bet.title}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {pods.map((pod) => (
            <tr
              key={pod.id}
              role="button"
              tabIndex={0}
              onClick={() => onPodClick(pod.id)}
              onKeyDown={(e) => e.key === "Enter" && onPodClick(pod.id)}
              className="hover:bg-accent/30 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2.5 font-medium sticky left-0 bg-background">
                {pod.name}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={pod.status} />
              </td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs">
                {pod.owner}
              </td>
              {bets.map((bet) => {
                const isPrimary = pod.primary_bet_id === bet.id;
                const isSecondary = pod.secondary_bet_id === bet.id;
                return (
                  <td key={bet.id} className="text-center px-2 py-2.5">
                    {isPrimary && (
                      <span className="inline-block w-3 h-3 rounded-full bg-foreground" title="Primary" />
                    )}
                    {isSecondary && (
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-foreground" title="Secondary" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
