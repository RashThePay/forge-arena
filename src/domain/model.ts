import type { ProtocolId } from "./ids";

export type StatDefinition = {
  id: ProtocolId;
  key: string;
  label: string;
  min: number;
  max: number;
  costByValue: readonly number[];
};

export type Requirement = {
  statId: ProtocolId;
  minimum: number;
};

export type CatalogOption = {
  id: ProtocolId;
  key: string;
  label: string;
  budgetCost: number;
  requirements?: readonly Requirement[];
};

export type TacticRule = {
  conditionId: ProtocolId;
  actionId: ProtocolId;
  targetRuleId: ProtocolId;
};

export type Build = {
  formatVersion: number;
  rulesetVersion: number;
  name: string;
  stats: Readonly<Record<number, number>>;
  equipmentIds: readonly ProtocolId[];
  skillIds: readonly ProtocolId[];
  tactics: readonly TacticRule[];
  appearance: Readonly<Record<string, ProtocolId>>;
};

export type RulesContract = {
  buildBudget: number;
  maxTactics: number;
  stats: readonly StatDefinition[];
  equipment: readonly CatalogOption[];
  skills: readonly CatalogOption[];
};
