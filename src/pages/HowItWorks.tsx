export default function HowItWorks() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-8">How Build Authority Works</h1>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">The Problem</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Strategic decisions live in slides, Slack threads, and executive memory.
          No one knows the current 5 most important bets, who owns them, or what revenue is exposed.
          When nothing forces constraint, everything gets priority — and nothing moves.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">The Model</h2>
        <p className="text-sm leading-relaxed text-muted-foreground mb-3">
          Build Authority enforces a simple operating constraint:
        </p>
        <p className="text-sm font-semibold mb-3">
          You can only have 5 active high-impact decisions at a time.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mb-4">
          Want to start something new? Close, accept, or reject something first.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mb-2">
          This single rule changes behavior:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
          <li>It forces prioritization (you can&apos;t have 12 &quot;top priorities&quot;)</li>
          <li>It forces closure (stale decisions decay visibly)</li>
          <li>It forces ownership (every decision has one accountable person)</li>
          <li>It forces exposure clarity (every decision carries a dollar value)</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">The Rhythm</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Monday — Decision Health Review (10 min)</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The system generates a snapshot: what moved, what didn&apos;t, what risk increased.
              Executive team reviews the 5 active decisions. No slides. No prep. Just the board.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1.5">During the Week — Owners Update Their Decisions</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Decision owners update outcome progress, exposure changes, and status.
              When a value changes, stakeholders are notified automatically.
              Stagnation is visible — if nothing moves for 7+ days, the decision visually decays.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1.5">When a Decision Resolves</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Owner marks it Accepted (validated) or Rejected (invalidated).
              A slot opens. The system prompts: &quot;You have capacity. What&apos;s the next highest-exposure bet?&quot;
              The closed decision moves to memory — lessons retained, not lost.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1.5">When Drift Happens</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If initiatives exist outside active decisions, the system flags it.
              If exposure increases without movement, it turns red.
              Inaction is not silent. It is surfaced.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Who Uses It</h2>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold">Role</th>
                <th className="text-left px-4 py-2.5 font-semibold">What They Do</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="px-4 py-2.5 font-medium text-foreground">Executive Sponsor</td>
                <td className="px-4 py-2.5">Registers decisions, reviews weekly health, adjudicates tradeoffs</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2.5 font-medium text-foreground">Decision Owner</td>
                <td className="px-4 py-2.5">Updates status, outcome progress, and exposure values</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Stakeholder</td>
                <td className="px-4 py-2.5">Views decisions, receives notifications on changes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">What Makes It Different</h2>
        <p className="text-sm leading-relaxed text-muted-foreground mb-3">
          This is not a dashboard. Dashboards display. This constrains.
          This is not a project manager. Projects track tasks. This tracks bets.
          This is not an OKR tool. OKRs measure. This forces choice.
        </p>
        <p className="text-sm font-medium">
          Build Authority makes decisions visible, measurable, and impossible to ignore.
        </p>
      </section>
    </div>
  );
}
