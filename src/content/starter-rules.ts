import { protocolId } from "../domain/ids";
import type { RulesContract } from "../domain/model";

const progressiveCosts = [0, 2, 5, 10, 18] as const;

export const STARTER_RULES: RulesContract = {
  buildBudget: 100,
  maxTactics: 5,
  maxSkills: 3,
  equipmentSlots: [],
  actions: [],
  maxHealth: { base: 20 },
  stats: [
    { id: protocolId(1), key: "power", label: "Power", min: 1, max: 5, costByValue: progressiveCosts },
    { id: protocolId(2), key: "precision", label: "Precision", min: 1, max: 5, costByValue: progressiveCosts },
    { id: protocolId(3), key: "speed", label: "Speed", min: 1, max: 5, costByValue: progressiveCosts },
    { id: protocolId(4), key: "endurance", label: "Endurance", min: 1, max: 5, costByValue: progressiveCosts },
    { id: protocolId(5), key: "resolve", label: "Resolve", min: 1, max: 5, costByValue: progressiveCosts },
  ],
  equipment: [],
  skills: [],
};
