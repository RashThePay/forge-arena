import { useMemo, useState, type ComponentType, type CSSProperties } from "react";
import {
  GiBattleGear, GiBroadsword, GiBullseye, GiCharacter, GiCrossedSwords, GiCrystalBall,
  GiHeartArmor, GiHeartBeats, GiMuscleUp, GiRoundShield, GiScrollUnfurled,
  GiSkills, GiThirdEye, GiUpgrade, GiWingfoot,
} from "react-icons/gi";
import { compileBuild } from "../domain/build-compiler";
import { encodeBuild } from "../domain/build-code";
import { calculateBuildCost } from "../domain/budget";
import { simulateDuel } from "../domain/duel";
import { protocolId, type ProtocolId } from "../domain/ids";
import type { Build, CatalogOption } from "../domain/model";
import { validateBuild } from "../domain/validation";
import { STARTER_BUILD } from "../content/starter-build";
import { IDS, STARTER_RULES } from "../content/starter-rules";
import { APPEARANCE_OPTIONS, APPEARANCE_SLOTS, appearanceValue, type AppearanceOption } from "../content/appearance";
import { LpcAvatar } from "./LpcAvatar";

type Tab = "appearance" | "attributes" | "arsenal" | "skills" | "tactics";
type GameIcon = ComponentType<{ className?: string }>;

const TABS: { id: Tab; label: string; icon: GameIcon }[] = [
  { id: "appearance", label: "Champion", icon: GiCharacter },
  { id: "attributes", label: "Attributes", icon: GiUpgrade },
  { id: "arsenal", label: "Arsenal", icon: GiBattleGear },
  { id: "skills", label: "Skills", icon: GiSkills },
  { id: "tactics", label: "Tactics", icon: GiScrollUnfurled },
];
const STAT_ICONS: Record<string, GameIcon> = {
  power: GiMuscleUp, precision: GiBullseye, speed: GiWingfoot,
  endurance: GiHeartBeats, resolve: GiThirdEye,
};
const CONDITION_LABELS = new Map<number, string>([
  [IDS.conditions.selfLow, "When my health falls below 35%"],
  [IDS.conditions.targetLow, "When the enemy falls below 35%"],
  [IDS.conditions.always, "Otherwise"],
]);
const ACTION_LABELS = new Map<number, string>([
  [IDS.actions.powerStrike, "Power Strike"], [IDS.actions.recover, "Second Wind"],
  [IDS.actions.quickCut, "Quick Cut"],
]);

export function App() {
  const [tab, setTab] = useState<Tab>("attributes");
  const [build, setBuild] = useState<Build>(STARTER_BUILD);
  const [notice, setNotice] = useState("Ready for the arena");
  const [trial, setTrial] = useState<{ won: boolean; elapsed: number } | null>(null);
  const cost = useMemo(() => calculateBuildCost(build, STARTER_RULES), [build]);
  const problems = useMemo(() => validateBuild(build, STARTER_RULES), [build]);
  const remaining = STARTER_RULES.buildBudget - cost;
  const percent = Math.min(100, Math.round((cost / STARTER_RULES.buildBudget) * 100));

  function changeStat(id: ProtocolId, delta: number) {
    const definition = STARTER_RULES.stats.find((stat) => stat.id === id)!;
    const next = Math.max(definition.min, Math.min(definition.max, build.stats[id] + delta));
    setBuild((value) => ({ ...value, stats: { ...value.stats, [id]: next } }));
  }

  function equip(option: CatalogOption) {
    const sameSlot = new Set(STARTER_RULES.equipment.filter((item) => item.slotId === option.slotId).map((item) => item.id));
    const equipmentIds = build.equipmentIds.filter((id) => !sameSlot.has(id));
    const defaultActionId = option.slotId === IDS.slots.mainHand ? option.grantedActionIds?.[0] : build.defaultActionId;
    setBuild((value) => ({ ...value, equipmentIds: [...equipmentIds, option.id], defaultActionId }));
  }

  function toggleSkill(option: CatalogOption) {
    const selected = build.skillIds.includes(option.id);
    if (!selected && build.skillIds.length >= (STARTER_RULES.maxSkills ?? 3)) {
      setNotice("All skill slots are occupied");
      return;
    }
    setBuild((value) => ({
      ...value,
      skillIds: selected ? value.skillIds.filter((id) => id !== option.id) : [...value.skillIds, option.id],
      tactics: selected ? value.tactics.filter((rule) => !(option.grantedActionIds ?? []).includes(rule.actionId)) : value.tactics,
    }));
  }

  function moveTactic(index: number, direction: -1 | 1) {
    const tactics = [...build.tactics];
    const target = index + direction;
    if (target < 0 || target >= tactics.length) return;
    [tactics[index], tactics[target]] = [tactics[target], tactics[index]];
    setBuild((value) => ({ ...value, tactics }));
  }

  function chooseAppearance(slot: ProtocolId, option: AppearanceOption) {
    setBuild((value) => ({ ...value, appearance: { ...value.appearance, [slot]: option.id } }));
  }

  async function copyCode() {
    const code = encodeBuild(build);
    await navigator.clipboard?.writeText(code);
    setNotice("Build code copied · " + code.length + " characters");
  }

  function runTrial() {
    if (problems.length) {
      setNotice("Resolve build conflicts before entering the arena");
      return;
    }
    const fighter = compileBuild(build, STARTER_RULES, protocolId(9001));
    const rival = { ...fighter, id: protocolId(9002), name: "Arena Echo" };
    const result = simulateDuel({ seed: 73, fighters: [fighter, rival] });
    const won = result.winnerId === fighter.id;
    setTrial({ won, elapsed: result.elapsed });
    setNotice(won ? "Trial won" : "The Arena Echo prevailed");
  }

  return (
    <main className="forge-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="game-bar">
        <div className="brand-lockup"><GiCrossedSwords /><div><span>FORGE</span><strong>ARENA</strong></div></div>
        <label className="build-title"><span>Current champion</span>
          <input value={build.name} maxLength={32} onChange={(event) => setBuild((value) => ({ ...value, name: event.target.value }))} />
        </label>
        <button className="code-action" onClick={copyCode}><GiCrystalBall /><span>Copy build code</span></button>
      </header>

      <section className="builder-frame">
        <nav className="chapter-rail" aria-label="Build sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon /><span>{label}</span></button>
          ))}
        </nav>

        <section className="champion-stage">
          <div className="stage-caption"><span>BUILD I</span><b>THE UNBROKEN</b></div>
          <div className="summoning-seal">
            <span className="seal-orbit orbit-a" /><span className="seal-orbit orbit-b" />
            <LpcAvatar appearance={build.appearance} className="stage-avatar" />
          </div>
          <div className="champion-nameplate"><small>CHAMPION</small><strong>{build.name || "Unnamed Fighter"}</strong><span>Level-free competitive build</span></div>
          <div className="loadout-orbits">
            {STARTER_RULES.equipmentSlots?.map((slot, index) => {
              const item = STARTER_RULES.equipment.find((option) => option.slotId === slot.id && build.equipmentIds.includes(option.id));
              const icons = [GiBroadsword, GiRoundShield, GiHeartArmor, GiCrystalBall];
              const Icon = icons[index];
              return <button key={slot.id} className={"orbit-slot slot-" + (index + 1)} onClick={() => setTab("arsenal")}><Icon /><span>{item?.label ?? "Empty"}</span></button>;
            })}
          </div>
          <button className="visual-note" onClick={() => setTab("appearance")}>LPC APPEARANCE · EDIT</button>
        </section>

        <aside className="control-vault">
          <div className="vault-heading"><div><span>{TABS.find((item) => item.id === tab)?.label}</span>
            <h2>{tab === "appearance" ? "Forge the champion" : tab === "attributes" ? "Shape the fighter" : tab === "arsenal" ? "Choose the loadout" : tab === "skills" ? "Bind combat arts" : "Write battle instincts"}</h2>
          </div><b>{tab === "skills" ? build.skillIds.length + "/" + STARTER_RULES.maxSkills : tab === "tactics" ? build.tactics.length + "/" + STARTER_RULES.maxTactics : "EDIT"}</b></div>

          <div className="vault-content">
            {tab === "appearance" && <div className="appearance-forge">
              <AppearanceGroup label="Body" slot={APPEARANCE_SLOTS.body} options={APPEARANCE_OPTIONS.body} appearance={build.appearance} choose={chooseAppearance} />
              <AppearanceGroup label="Skin tone" slot={APPEARANCE_SLOTS.skin} options={APPEARANCE_OPTIONS.skin} appearance={build.appearance} choose={chooseAppearance} swatches />
              <AppearanceGroup label="Hair" slot={APPEARANCE_SLOTS.hair} options={APPEARANCE_OPTIONS.hair} appearance={build.appearance} choose={chooseAppearance} />
              <AppearanceGroup label="Hair tone" slot={APPEARANCE_SLOTS.hairColor} options={APPEARANCE_OPTIONS.hairColor} appearance={build.appearance} choose={chooseAppearance} swatches />
              <AppearanceGroup label="Pose" slot={APPEARANCE_SLOTS.facing} options={APPEARANCE_OPTIONS.facing} appearance={build.appearance} choose={chooseAppearance} />
              <p className="appearance-credit">Universal LPC · appearance is free and encoded with the build</p>
            </div>}
            {tab === "attributes" && <div className="stat-list">{STARTER_RULES.stats.map((stat) => {
              const Icon = STAT_ICONS[stat.key]; const value = build.stats[stat.id];
              return <div className="stat-row" key={stat.id}><Icon /><div><strong>{stat.label}</strong><span>{["Raw", "Trained", "Capable", "Elite", "Mythic"][value - 1]}</span></div>
                <button onClick={() => changeStat(stat.id, -1)} disabled={value <= stat.min}>−</button><em>{value}</em>
                <button onClick={() => changeStat(stat.id, 1)} disabled={value >= stat.max}>+</button></div>;
            })}</div>}

            {tab === "arsenal" && <div className="arsenal-groups">{STARTER_RULES.equipmentSlots?.map((slot) => (
              <div className="arsenal-group" key={slot.id}><h3>{slot.label}</h3><div className="choice-strip">
                {STARTER_RULES.equipment.filter((item) => item.slotId === slot.id).map((item) => {
                  const selected = build.equipmentIds.includes(item.id);
                  const requirement = item.requirements?.[0];
                  const locked = requirement ? build.stats[requirement.statId] < requirement.minimum : false;
                  return <button key={item.id} className={selected ? "selected" : ""} disabled={locked} onClick={() => equip(item)}>
                    <GiBroadsword /><strong>{item.label}</strong><span>{locked ? "Requirement not met" : item.budgetCost + " pts"}</span></button>;
                })}
              </div></div>
            ))}</div>}

            {tab === "skills" && <div className="skill-rack">{STARTER_RULES.skills.map((skill) => {
              const selected = build.skillIds.includes(skill.id);
              return <button key={skill.id} className={selected ? "selected" : ""} onClick={() => toggleSkill(skill)}>
                <GiSkills /><div><strong>{skill.label}</strong><span>{skill.budgetCost} budget · grants an action</span></div><b>{selected ? "BOUND" : "LEARN"}</b></button>;
            })}</div>}

            {tab === "tactics" && <div className="tactic-stack">{build.tactics.map((rule, index) => (
              <div className="tactic-rule" key={String(rule.conditionId) + "-" + String(rule.actionId)}><i>{index + 1}</i><div>
                <span>{CONDITION_LABELS.get(rule.conditionId)}</span><strong>{ACTION_LABELS.get(rule.actionId)}</strong></div>
                <div className="rule-order"><button onClick={() => moveTactic(index, -1)} disabled={!index}>▲</button>
                  <button onClick={() => moveTactic(index, 1)} disabled={index === build.tactics.length - 1}>▼</button></div></div>
            ))}<p>Rules are free. The first valid rule becomes the champion’s next action.</p></div>}
          </div>
        </aside>

        <footer className="battle-dock">
          <div className={"budget-core " + (remaining < 0 ? "danger" : "")} style={{ "--budget": percent + "%" } as CSSProperties}>
            <span>{remaining >= 0 ? "REMAINING" : "OVER LIMIT"}</span><strong>{Math.abs(remaining)}</strong><small>{cost} / 100</small>
          </div>
          <div className="status-ribbon"><span className={problems.length ? "warning" : "ready"}>{problems.length ? problems.length + " CONFLICTS" : "BATTLE READY"}</span>
            <p>{notice}</p>{trial && <b>{trial.won ? "VICTORY" : "DEFEAT"} · {trial.elapsed} ticks</b>}</div>
          <button className="arena-action" onClick={runTrial}><GiCrossedSwords /><span>Trial Duel</span><small>TEST THIS BUILD</small></button>
        </footer>
      </section>
    </main>
  );
}

type AppearanceGroupProps = {
  label: string;
  slot: ProtocolId;
  options: readonly AppearanceOption[];
  appearance: Build["appearance"];
  choose: (slot: ProtocolId, option: AppearanceOption) => void;
  swatches?: boolean;
};

function AppearanceGroup({ label, slot, options, appearance, choose, swatches }: AppearanceGroupProps) {
  const selected = appearanceValue(appearance, slot);
  return <fieldset className={`appearance-group ${swatches ? "swatches" : ""}`}>
    <legend>{label}</legend>
    <div>{options.map((option) => <button type="button" key={option.id} className={selected === option.id ? "selected" : ""} onClick={() => choose(slot, option)} aria-pressed={selected === option.id}>
      {option.swatch && <i style={{ background: option.swatch }} />}
      <span>{option.label}</span>
    </button>)}</div>
  </fieldset>;
}
