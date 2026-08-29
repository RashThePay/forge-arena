import type { ProtocolId } from "./ids";
import type { ActionDefinition, EffectTarget, ResourceDefinition, StatusDefinition } from "./content";
import type { ConditionDefinition, TargetRuleDefinition } from "./tactics";

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
  slotId?: ProtocolId;
  grantedActionIds?: readonly ProtocolId[];
  grantedResources?: readonly ResourceDefinition[];
  grantedStatuses?: readonly StatusDefinition[];
};

export type EquipmentSlotDefinition = {
  id: ProtocolId;
  key: string;
  label: string;
};

export type StatFormula = {
  base: number;
  terms?: readonly { statId: ProtocolId; multiplier: number }[];
  minimum?: number;
  maximum?: number;
};

export type EffectBlueprint =
  | { type: "damage"; target: EffectTarget; amount: StatFormula; tags?: readonly string[] }
  | { type: "heal"; target: EffectTarget; amount: StatFormula }
  | { type: "changeResource"; target: EffectTarget; resourceId: ProtocolId; amount: number }
  | { type: "applyStatus"; target: EffectTarget; status: StatusDefinition; stacks?: number };

export type ActionBlueprint = Omit<ActionDefinition, "accuracy" | "effects"> & {
  accuracy: StatFormula;
  effects: readonly EffectBlueprint[];
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
  defaultActionId?: ProtocolId;
  tactics: readonly TacticRule[];
  appearance: Readonly<Record<number, ProtocolId>>;
};

export type RulesContract = {
  buildBudget: number;
  maxTactics: number;
  stats: readonly StatDefinition[];
  equipment: readonly CatalogOption[];
  skills: readonly CatalogOption[];
  equipmentSlots?: readonly EquipmentSlotDefinition[];
  maxSkills?: number;
  actions?: readonly ActionBlueprint[];
  maxHealth?: StatFormula;
  tacticConditions?: readonly ConditionDefinition[];
  targetRules?: readonly TargetRuleDefinition[];
};
