import { useMemo, useState } from "react";
import { GiCrossedSwords, GiRollingDices, GiSwordsEmblem } from "react-icons/gi";
import { APPEARANCE_ASSETS, APPEARANCE_SLOTS } from "../content/appearance";
import { STARTER_BUILD } from "../content/starter-build";
import { IDS, STARTER_RULES } from "../content/starter-rules";
import type { BattleEvent } from "../domain/battle";
import { BattleSetupError, runBuildCodeDuel, type BuildCodeDuel } from "../domain/battle-session";
import { encodeBuild } from "../domain/build-code";
import type { Build } from "../domain/model";
import { LpcAvatar } from "./LpcAvatar";

type Props = { currentBuild: Build };

const ACTION_NAMES = new Map<number, string>([
  [IDS.actions.sword, "Longsword"], [IDS.actions.hammer, "Warhammer"],
  [IDS.actions.powerStrike, "Power Strike"], [IDS.actions.recover, "Second Wind"],
  [IDS.actions.quickCut, "Quick Cut"],
]);

function rivalBuild(): Build {
  return { ...STARTER_BUILD, name: "Arena Echo", appearance: {
    ...STARTER_BUILD.appearance,
    [APPEARANCE_SLOTS.body]: APPEARANCE_ASSETS.feminine,
    [APPEARANCE_SLOTS.hair]: APPEARANCE_ASSETS.hairMessy,
    [APPEARANCE_SLOTS.hairColor]: APPEARANCE_ASSETS.hairAuburn,
    [APPEARANCE_SLOTS.facing]: APPEARANCE_ASSETS.faceLeft,
  } };
}

function eventText(event: BattleEvent, duel: BuildCodeDuel): string | null {
  const name = (id: number) => duel.builds[duel.fighterIds[0] === id ? 0 : 1].name;
  if (event.type === "DAMAGE_APPLIED") return `${name(event.sourceId)} deals ${event.amount} damage`;
  if (event.type === "HEAL_APPLIED") return `${name(event.sourceId)} restores ${event.amount} health`;
  if (event.type === "ACTION_RESOLVED" && !event.hit) return `${name(event.actorId)} misses with ${ACTION_NAMES.get(event.actionId) ?? "an action"}`;
  if (event.type === "CHARACTER_DEFEATED") return `${name(event.characterId)} is defeated`;
  return null;
}

export function BattleRoom({ currentBuild }: Props) {
  const [leftCode, setLeftCode] = useState(() => encodeBuild(currentBuild));
  const [rightCode, setRightCode] = useState(() => encodeBuild(rivalBuild()));
  const [seed, setSeed] = useState(73);
  const [duel, setDuel] = useState<BuildCodeDuel | null>(null);
  const [error, setError] = useState<{ side: "left" | "right"; message: string } | null>(null);
  const log = useMemo(() => duel?.result.events.map((event) => ({ event, text: eventText(event, duel) })).filter((item) => item.text) ?? [], [duel]);

  function fight() {
    try {
      setDuel(runBuildCodeDuel(leftCode, rightCode, STARTER_RULES, seed));
      setError(null);
    } catch (cause) {
      setDuel(null);
      setError(cause instanceof BattleSetupError ? cause : { side: "left", message: cause instanceof Error ? cause.message : "Battle setup failed" });
    }
  }

  return <section className="battle-room">
    <div className="battle-heading"><div><span>DUEL · 1 VS 1</span><h1>The Trial Chamber</h1></div><p>Two build codes enter. The deterministic timeline decides.</p></div>
    <div className="versus-stage">
      <FighterGate side="left" code={leftCode} setCode={setLeftCode} fallback={currentBuild} duel={duel} error={error?.side === "left" ? error.message : null} useCurrent={() => setLeftCode(encodeBuild(currentBuild))} />
      <div className="versus-mark"><GiSwordsEmblem /><strong>VS</strong><span>SEED {seed}</span></div>
      <FighterGate side="right" code={rightCode} setCode={setRightCode} fallback={rivalBuild()} duel={duel} error={error?.side === "right" ? error.message : null} />
    </div>
    <div className="duel-console">
      <div className="seed-control"><GiRollingDices /><label><span>Battle seed</span><input type="number" min="0" max="999999" value={seed} onChange={(event) => setSeed(Math.max(0, Number(event.target.value) || 0))} /></label></div>
      <button className="fight-action" onClick={fight}><GiCrossedSwords /><span>Begin Duel</span><small>SIMULATE THE BATTLE</small></button>
      <div className="duel-verdict">{duel ? <><span>VICTOR</span><strong>{duel.builds[duel.result.winnerId === duel.fighterIds[0] ? 0 : 1].name}</strong><small>{duel.result.elapsed} ticks · {duel.result.events.length} events</small></> : <><span>CHAMBER STATUS</span><strong>{error ? "CODE REJECTED" : "AWAITING COMBATANTS"}</strong><small>{error?.message ?? "Both build slots are ready"}</small></>}</div>
    </div>
    <aside className="battle-log"><header><span>Combat chronicle</span><b>{log.length} decisive events</b></header><div>{log.length ? log.map(({ event, text }, index) => <article key={`${event.type}-${event.at}-${index}`}><time>{event.at}</time><i /><p>{text}</p></article>) : <div className="empty-chronicle"><GiCrossedSwords /><p>The chronicle will be carved when the duel begins.</p></div>}</div></aside>
  </section>;
}

type GateProps = { side: "left" | "right"; code: string; setCode: (code: string) => void; fallback: Build; duel: BuildCodeDuel | null; error: string | null; useCurrent?: () => void };
function FighterGate({ side, code, setCode, fallback, duel, error, useCurrent }: GateProps) {
  const index = side === "left" ? 0 : 1;
  const build = duel?.builds[index] ?? fallback;
  const fighterId = duel?.fighterIds[index];
  const health = fighterId ? duel.finalHealth[fighterId] : null;
  const maximum = fighterId ? duel.maxHealth[fighterId] : null;
  return <section className={`fighter-gate ${side} ${error ? "invalid" : ""}`}>
    <div className="gate-banner"><span>{side === "left" ? "CHALLENGER I" : "CHALLENGER II"}</span><strong>{build.name}</strong></div>
    <div className="gate-avatar"><LpcAvatar appearance={build.appearance} /></div>
    <div className="health-track"><i style={{ width: health === null || maximum === null ? "100%" : `${(health / maximum) * 100}%` }} /><span>{health === null ? "READY" : `${health} / ${maximum} HP`}</span></div>
    <label className="code-rune"><span>FA1 BUILD CODE</span><textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label={`${side} fighter build code`} /></label>
    {useCurrent && <button className="current-build-action" onClick={useCurrent}>Use current forge build</button>}
    {error && <p className="gate-error">{error}</p>}
  </section>;
}
