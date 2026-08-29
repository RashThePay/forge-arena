import type { ProtocolId } from "./ids";
import type { Build, CatalogOption, RulesContract, StatDefinition } from "./model";

function statCost(definition: StatDefinition, value: number): number {
  if (!Number.isInteger(value) || value < definition.min || value > definition.max) {
    throw new Error(`${definition.key} must be between ${definition.min} and ${definition.max}`);
  }

  return definition.costByValue[value - definition.min] ?? 0;
}

function optionCost(ids: readonly ProtocolId[], options: readonly CatalogOption[]): number {
  const costs = new Map(options.map((option) => [option.id, option.budgetCost]));
  return ids.reduce((total, id) => total + (costs.get(id) ?? 0), 0);
}

export function calculateBuildCost(build: Build, rules: RulesContract): number {
  const stats = rules.stats.reduce(
    (total, definition) => total + statCost(definition, build.stats[definition.id] ?? definition.min),
    0,
  );

  return (
    stats +
    optionCost(build.equipmentIds, rules.equipment) +
    optionCost(build.skillIds, rules.skills)
  );
}
