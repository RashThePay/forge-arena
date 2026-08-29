import type { ActionDefinition, EffectDefinition, ResourceDefinition, StatusDefinition } from "./content";
import type { DuelFighter } from "./duel";
import { resolveFormula } from "./formulas";
import type { ProtocolId } from "./ids";
import type { ActionBlueprint, Build, CatalogOption, EffectBlueprint, RulesContract } from "./model";
import { validateBuild } from "./validation";

function uniqueById<T extends { id: ProtocolId }>(values: readonly T[]): T[] {
  return [...new Map(values.map((value) => [value.id, value])).values()];
}

function selections(build: Build, rules: RulesContract): CatalogOption[] {
  const selected = new Set([...build.equipmentIds, ...build.skillIds]);
  return [...rules.equipment, ...rules.skills].filter((option) => selected.has(option.id));
}

function compileEffect(effect: EffectBlueprint, stats: Build["stats"]): EffectDefinition {
  if (effect.type === "damage" || effect.type === "heal") {
    return { ...effect, amount: resolveFormula(effect.amount, stats) };
  }
  return effect;
}

export function compileAction(blueprint: ActionBlueprint, stats: Build["stats"]): ActionDefinition {
  return {
    ...blueprint,
    accuracy: resolveFormula(blueprint.accuracy, stats),
    effects: blueprint.effects.map((effect) => compileEffect(effect, stats)),
  };
}

export function compileBuild(
  build: Build,
  rules: RulesContract,
  fighterId: ProtocolId,
): DuelFighter {
  const problems = validateBuild(build, rules);
  if (problems.length > 0) {
    throw new Error(`Cannot compile invalid build: ${problems.map((problem) => problem.code).join(", ")}`);
  }

  const selected = selections(build, rules);
  const grantedIds = new Set(selected.flatMap((option) => option.grantedActionIds ?? []));
  const blueprints = (rules.actions ?? []).filter((action) => grantedIds.has(action.id));
  const actions = blueprints.map((action) => compileAction(action, build.stats));
  const defaultAction = actions.find((action) => action.id === build.defaultActionId);
  if (!defaultAction) throw new Error("Build does not provide its selected default action");

  const resources: ResourceDefinition[] = uniqueById(selected.flatMap((option) => option.grantedResources ?? []));
  const statuses: StatusDefinition[] = uniqueById(selected.flatMap((option) => option.grantedStatuses ?? []));

  return {
    id: fighterId,
    name: build.name,
    maxHealth: resolveFormula(rules.maxHealth ?? { base: 1 }, build.stats),
    defaultAction,
    resources,
    statuses,
  };
}
