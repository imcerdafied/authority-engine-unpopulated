export default function HowItWorks() {
  return (
    <div className="w-full md:max-w-2xl md:mx-auto space-y-8">
      <h1 className="text-xl font-bold">How Build Authority Works</h1>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">The Model</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can only have 5 active high-impact bets at a time. Want to start something new? Close one first.
          This single constraint changes behavior: it forces prioritization, closure, ownership, and exposure clarity.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          Over time, bets close and new ones enter. The cap never lifts. A company that processed 20 bets through this system in a year made 20 explicit, accountable strategic choices. That&apos;s the compounding effect.
        </p>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">The Rhythm</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Monday — Bet Health Review (10 min):</strong> the system shows what moved, what didn&apos;t, what risk increased.
          </p>
          <p>
            <strong className="text-foreground">During the Week — Owners update outcome progress, exposure, and status.</strong> Stagnation is visible. If nothing moves for 7+ days, the bet visually decays.
          </p>
          <p>
            <strong className="text-foreground">When a Bet Resolves —</strong> Owner closes it. A slot opens. Lessons are retained in memory.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Who Uses It</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="border rounded-md p-3">
            <p className="font-medium">Executive Sponsor</p>
            <p className="text-muted-foreground">Registers bets, reviews weekly health</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="font-medium">Bet Owner</p>
            <p className="text-muted-foreground">Updates status, progress, and exposure values</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="font-medium">Stakeholder</p>
            <p className="text-muted-foreground">Views bets, sees changes</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Measure What Matters</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every bet declares what success looks like. Outcome Metrics let you define the measurable targets behind each bet — retention rates, revenue milestones, activation goals.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          Each metric tracks progress in real time with clear status indicators: <strong className="text-foreground">OnTrack</strong>, <strong className="text-foreground">AtRisk</strong>, or <strong className="text-foreground">OffTrack</strong>. When a metric changes, the system automatically reassesses which initiatives deserve priority. Metrics aren&apos;t standalone dashboards — they drive what gets built next.
        </p>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Always Know What to Build Next</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Initiatives are the things your team is building or considering. Each initiative is scored and ranked based on its expected value, your confidence in its success, the effort required, and how well it aligns to your declared outcomes.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          The system continuously re-ranks initiatives as conditions change — when metrics move, when new information arrives, or when priorities shift. <strong className="text-foreground">No spreadsheets. No weekly reprioritization meetings.</strong> The ranking updates itself. The top initiative is always the highest-leverage move available to you right now.
        </p>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Know When Execution Drifts from Strategy</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Build Authority watches for misalignment between what you said matters and what&apos;s actually getting built.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
          <div className="border rounded-md p-3">
            <p className="font-medium">Alignment Drift</p>
            <p className="text-muted-foreground">Your top initiatives all target the same outcome while others are neglected.</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="font-medium">Metric Gap</p>
            <p className="text-muted-foreground">A critical metric is declining but nothing in your top priorities addresses it.</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          These aren&apos;t reports you have to pull. They appear automatically, right on your bet cards, the moment conditions change. Subtle alerts that inform without alarming — confidence that someone is watching the strategy.
        </p>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">The Closed Loop</h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium my-3">
          <span>Capital</span>
          <span className="text-muted-foreground/40">→</span>
          <span>Outcomes</span>
          <span className="text-muted-foreground/40">→</span>
          <span>Execution</span>
          <span className="text-muted-foreground/40">→</span>
          <span>Measurement</span>
          <span className="text-muted-foreground/40">→</span>
          <span>Adaptation</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Build Authority connects the full cycle. You allocate capital to strategic bets. You declare what outcomes those bets must deliver. You define how to measure success. You add the initiatives that will get you there. The system ranks them, monitors progress, detects when things drift, and tells you exactly what moved and why.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          This isn&apos;t a dashboard — it&apos;s a continuously aligned operating layer.
        </p>
      </section>

      <footer className="pt-4 border-t text-sm text-muted-foreground">
        <p>
          This is not a dashboard. It constrains. Not a project manager. It tracks bets. Not an OKR tool. It forces choice.
        </p>
      </footer>
    </div>
  );
}
