import { protocolId } from "../domain/ids";
import type { RulesContract } from "../domain/model";

export const IDS = {
  stats: {
    power: protocolId(1), precision: protocolId(2), speed: protocolId(3),
    endurance: protocolId(4), resolve: protocolId(5),
  },
  slots: {
    mainHand: protocolId(101), offHand: protocolId(102), armor: protocolId(103), charm: protocolId(104),
  },
  equipment: {
    longsword: protocolId(201), warhammer: protocolId(202), buckler: protocolId(203),
    focus: protocolId(204), leather: protocolId(205), plate: protocolId(206), ember: protocolId(207),
  },
  skills: {
    powerStrike: protocolId(301), recover: protocolId(302), quickCut: protocolId(303),
  },
  actions: {
    sword: protocolId(401), hammer: protocolId(402), powerStrike: protocolId(403),
    recover: protocolId(404), quickCut: protocolId(405),
  },
  conditions: {
    always: protocolId(501), selfLow: protocolId(502), targetLow: protocolId(503), targetHeavy: protocolId(504),
  },
  targets: { opponent: protocolId(601), self: protocolId(602) },
} as const;

const progressiveCosts = [0, 2, 5, 10, 18] as const;

export const STARTER_RULES: RulesContract = {
  buildBudget: 100,
  maxTactics: 5,
  maxSkills: 3,
  stats: [
    { id: IDS.stats.power, key: "power", label: "Power", min: 1, max: 5, costByValue: progressiveCosts },
    { id: IDS.stats.precision, key: "precision", label: "Precision", min: 1, max: 5, costByValue: progressiveCosts },
    { id: IDS.stats.speed, key: "speed", label: "Speed", min: 1, max: 5, costByValue: progressiveCosts },
    { id: IDS.stats.endurance, key: "endurance", label: "Endurance", min: 1, max: 5, costByValue: progressiveCosts },
    { id: IDS.stats.resolve, key: "resolve", label: "Resolve", min: 1, max: 5, costByValue: progressiveCosts },
  ],
  equipmentSlots: [
    { id: IDS.slots.mainHand, key: "main-hand", label: "Main Hand" },
    { id: IDS.slots.offHand, key: "off-hand", label: "Off Hand" },
    { id: IDS.slots.armor, key: "armor", label: "Armor" },
    { id: IDS.slots.charm, key: "charm", label: "Charm" },
  ],
  equipment: [
    {
      id: IDS.equipment.longsword, key: "longsword", label: "Longsword", budgetCost: 12,
      slotId: IDS.slots.mainHand, requirements: [{ statId: IDS.stats.precision, minimum: 2 }],
      grantedActionIds: [IDS.actions.sword],
    },
    {
      id: IDS.equipment.warhammer, key: "warhammer", label: "Warhammer", budgetCost: 15,
      slotId: IDS.slots.mainHand, requirements: [{ statId: IDS.stats.power, minimum: 3 }],
      grantedActionIds: [IDS.actions.hammer],
    },
    { id: IDS.equipment.buckler, key: "buckler", label: "Buckler", budgetCost: 8, slotId: IDS.slots.offHand },
    { id: IDS.equipment.focus, key: "focus", label: "Empty Hand", budgetCost: 0, slotId: IDS.slots.offHand },
    { id: IDS.equipment.leather, key: "leather", label: "Leather Guard", budgetCost: 8, slotId: IDS.slots.armor },
    {
      id: IDS.equipment.plate, key: "plate", label: "Plate Harness", budgetCost: 14,
      slotId: IDS.slots.armor, requirements: [{ statId: IDS.stats.endurance, minimum: 3 }],
    },
    { id: IDS.equipment.ember, key: "ember", label: "Ember Charm", budgetCost: 7, slotId: IDS.slots.charm },
  ],
  skills: [
    {
      id: IDS.skills.powerStrike, key: "power-strike", label: "Power Strike", budgetCost: 12,
      grantedActionIds: [IDS.actions.powerStrike],
    },
    {
      id: IDS.skills.recover, key: "recover", label: "Second Wind", budgetCost: 10,
      grantedActionIds: [IDS.actions.recover],
    },
    {
      id: IDS.skills.quickCut, key: "quick-cut", label: "Quick Cut", budgetCost: 9,
      grantedActionIds: [IDS.actions.quickCut],
    },
  ],
  actions: [
    {
      id: IDS.actions.sword, tags: ["attack", "melee"], windup: 26, recovery: 22,
      accuracy: { base: 0.52, terms: [{ statId: IDS.stats.precision, multiplier: 0.08 }], maximum: 0.95 },
      effects: [{ type: "damage", target: "target", amount: { base: 3, terms: [{ statId: IDS.stats.power, multiplier: 2 }] } }],
    },
    {
      id: IDS.actions.hammer, tags: ["attack", "melee", "heavy"], windup: 42, recovery: 28,
      accuracy: { base: 0.42, terms: [{ statId: IDS.stats.precision, multiplier: 0.07 }], maximum: 0.88 },
      effects: [{ type: "damage", target: "target", amount: { base: 7, terms: [{ statId: IDS.stats.power, multiplier: 2.8 }] } }],
    },
    {
      id: IDS.actions.powerStrike, tags: ["attack", "melee", "heavy"], windup: 48, recovery: 32,
      accuracy: { base: 0.4, terms: [{ statId: IDS.stats.precision, multiplier: 0.07 }], maximum: 0.9 },
      effects: [{ type: "damage", target: "target", amount: { base: 8, terms: [{ statId: IDS.stats.power, multiplier: 3 }] } }],
    },
    {
      id: IDS.actions.recover, tags: ["healing"], windup: 34, recovery: 26, accuracy: { base: 1 },
      effects: [{ type: "heal", target: "actor", amount: { base: 5, terms: [{ statId: IDS.stats.resolve, multiplier: 2 }] } }],
    },
    {
      id: IDS.actions.quickCut, tags: ["attack", "melee", "quick"], windup: 14, recovery: 16,
      accuracy: { base: 0.55, terms: [{ statId: IDS.stats.precision, multiplier: 0.08 }], maximum: 0.97 },
      effects: [{ type: "damage", target: "target", amount: { base: 1, terms: [{ statId: IDS.stats.power, multiplier: 1.25 }] } }],
    },
  ],
  maxHealth: { base: 18, terms: [{ statId: IDS.stats.endurance, multiplier: 7 }] },
  tacticConditions: [
    { id: IDS.conditions.always, key: "always", predicate: { type: "always" } },
    { id: IDS.conditions.selfLow, key: "self-low", predicate: { type: "healthBelow", subject: "actor", ratio: 0.35 } },
    { id: IDS.conditions.targetLow, key: "target-low", predicate: { type: "healthBelow", subject: "target", ratio: 0.35 } },
    { id: IDS.conditions.targetHeavy, key: "target-heavy", predicate: { type: "targetActionTagged", tag: "heavy" } },
  ],
  targetRules: [
    { id: IDS.targets.opponent, key: "opponent", type: "opponent" },
    { id: IDS.targets.self, key: "self", type: "self" },
  ],
};
