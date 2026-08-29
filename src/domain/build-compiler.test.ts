import { describe, expect, it } from "vitest";
import { compileBuild } from "./build-compiler";
import { protocolId } from "./ids";
import type { Build, RulesContract } from "./model";

const POWER = protocolId(1);
const ENDURANCE = protocolId(2);
const MAIN_HAND = protocolId(10);
const SWORD = protocolId(20);
const STRIKE = protocolId(30);

const rules: RulesContract = {
  buildBudget: 30,
  maxTactics: 5,
  maxSkills: 2,
  stats: [
    { id: POWER, key: "power", label: "Power", min: 1, max: 5, costByValue: [0, 2, 5, 9, 14] },
    { id: ENDURANCE, key: "endurance", label: "Endurance", min: 1, max: 5, costByValue: [0, 2, 5, 9, 14] },
  ],
  equipmentSlots: [{ id: MAIN_HAND, key: "main-hand", label: "Main Hand" }],
  equipment: [{
    id: SWORD, key: "sword", label: "Sword", budgetCost: 5, slotId: MAIN_HAND,
    requirements: [{ statId: POWER, minimum: 2 }], grantedActionIds: [STRIKE],
  }],
  skills: [],
  maxHealth: { base: 10, terms: [{ statId: ENDURANCE, multiplier: 5 }] },
  actions: [{
    id: STRIKE, tags: ["attack", "melee"], windup: 20, recovery: 15,
    accuracy: { base: 0.5, terms: [{ statId: POWER, multiplier: 0.05 }], maximum: 0.95 },
    effects: [{
      type: "damage", target: "target", amount: { base: 2, terms: [{ statId: POWER, multiplier: 2 }] },
    }],
  }],
};

const build: Build = {
  formatVersion: 1, rulesetVersion: 1, name: "Builder",
  stats: { [POWER]: 3, [ENDURANCE]: 2 },
  equipmentIds: [SWORD], skillIds: [], tactics: [], appearance: {}, defaultActionId: STRIKE,
};

describe("build compiler", () => {
  it("resolves data formulas into an engine-ready fighter", () => {
    const fighter = compileBuild(build, rules, protocolId(100));
    expect(fighter.maxHealth).toBe(20);
    expect(fighter.defaultAction.accuracy).toBeCloseTo(0.65);
    expect(fighter.defaultAction.effects[0]).toEqual({ type: "damage", target: "target", amount: 8 });
  });

  it("does not compile builds that fail equipment requirements", () => {
    expect(() => compileBuild({ ...build, stats: { [POWER]: 1, [ENDURANCE]: 2 } }, rules, protocolId(100)))
      .toThrow("UNMET_REQUIREMENT");
  });

  it("rejects two equipment choices for the same slot", () => {
    const second = protocolId(21);
    const conflictingRules = {
      ...rules,
      equipment: [...rules.equipment, { ...rules.equipment[0], id: second, key: "axe" }],
    };
    expect(() => compileBuild({ ...build, equipmentIds: [SWORD, second] }, conflictingRules, protocolId(100)))
      .toThrow("SLOT_CONFLICT");
  });

  it("requires the fallback action to come from selected content", () => {
    expect(() => compileBuild({ ...build, defaultActionId: protocolId(999) }, rules, protocolId(100)))
      .toThrow("DEFAULT_ACTION_UNAVAILABLE");
  });
});
