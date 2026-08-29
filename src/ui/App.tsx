import { STARTER_RULES } from "../content/starter-rules";

export function App() {
  return (
    <main className="shell">
      <p className="eyebrow">PHASE ZERO · SYSTEM CONTRACT</p>
      <h1>Forge Arena</h1>
      <p className="lede">
        A deterministic fantasy battle simulator where stats, equipment,
        skills, and tactics form the build.
      </p>

      <section className="contract" aria-label="Current rules contract">
        <div>
          <span>Build budget</span>
          <strong>{STARTER_RULES.buildBudget}</strong>
        </div>
        <div>
          <span>Tactic limit</span>
          <strong>{STARTER_RULES.maxTactics}</strong>
        </div>
        <div>
          <span>Battle clock</span>
          <strong>Event timeline</strong>
        </div>
        <div>
          <span>Positioning</span>
          <strong>None</strong>
        </div>
      </section>
    </main>
  );
}
