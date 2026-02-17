export default function HowItWorks() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-bold">How Build Authority Works</h1>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">The Model</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can only have 5 active high-impact decisions at a time. Want to start something new? Close one first.
          This single constraint changes behavior: it forces prioritization, closure, ownership, and exposure clarity.
        </p>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">The Rhythm</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Monday — Decision Health Review (10 min):</strong> the system shows what moved, what didn&apos;t, what risk increased.
          </p>
          <p>
            <strong className="text-foreground">During the Week — Owners update outcome progress, exposure, and status.</strong> Stagnation is visible. If nothing moves for 7+ days, the decision visually decays.
          </p>
          <p>
            <strong className="text-foreground">When a Decision Resolves —</strong> Owner closes it. A slot opens. Lessons are retained in memory.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Who Uses It</h2>
        <div className="grid gap-3 text-sm">
          <div className="border rounded-md p-3">
            <p className="font-medium">Executive Sponsor</p>
            <p className="text-muted-foreground">Registers decisions, reviews weekly health</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="font-medium">Decision Owner</p>
            <p className="text-muted-foreground">Updates status, progress, and exposure values</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="font-medium">Stakeholder</p>
            <p className="text-muted-foreground">Views decisions, sees changes</p>
          </div>
        </div>
      </section>

      <footer className="pt-4 border-t text-sm text-muted-foreground">
        <p>
          This is not a dashboard. It constrains. Not a project manager. It tracks bets. Not an OKR tool. It forces choice.
        </p>
      </footer>
    </div>
  );
}
