import { calculateBuildCost } from "./budget";
import type { ProtocolId } from "./ids";
import type { Build, CatalogOption, Requirement, RulesContract } from "./model";

export type BuildProblem =
  | { code: "OVER_BUDGET"; actual: number; maximum: number }
  | { code: "TOO_MANY_TACTICS"; actual: number; maximum: number }
  | { code: "UNKNOWN_OPTION"; optionId: number }
  | { code: "UNMET_REQUIREMENT"; optionId: number; requirement: Requirement }
  | { code: "UNKNOWN_STAT"; statId: number }
  | { code: "MISSING_STAT"; statId: number }
  | { code: "STAT_OUT_OF_RANGE"; statId: number; actual: number; minimum: number; maximum: number }
  | { code: "DUPLICATE_SELECTION"; optionId: number }
  | { code: "SLOT_CONFLICT"; slotId: number; optionIds: readonly number[] }
  | { code: "TOO_MANY_SKILLS"; actual: number; maximum: number }
  | { code: "DEFAULT_ACTION_UNAVAILABLE"; actionId?: number };

function validateOptions(
  build: Build,
  selectedIds: readonly ProtocolId[],
  catalog: readonly CatalogOption[],
): BuildProblem[] {
  const byId = new Map(catalog.map((option) => [option.id, option]));

  return selectedIds.flatMap((id): BuildProblem[] => {
    const option = byId.get(id);
    if (!option) return [{ code: "UNKNOWN_OPTION", optionId: id }];

    return (option.requirements ?? [])
      .filter((requirement) => (build.stats[requirement.statId] ?? 0) < requirement.minimum)
      .map((requirement) => ({ code: "UNMET_REQUIREMENT", optionId: id, requirement }));
  });
}

export function validateBuild(build: Build, rules: RulesContract): BuildProblem[] {
  const problems: BuildProblem[] = [];
  const stats = new Map<number, (typeof rules.stats)[number]>(
    rules.stats.map((stat) => [stat.id, stat]),
  );
  for (const [rawId, value] of Object.entries(build.stats)) {
    const statId = Number(rawId);
    const definition = stats.get(statId);
    if (!definition) {
      problems.push({ code: "UNKNOWN_STAT", statId });
    } else if (!Number.isInteger(value) || value < definition.min || value > definition.max) {
      problems.push({ code: "STAT_OUT_OF_RANGE", statId, actual: value, minimum: definition.min, maximum: definition.max });
    }
  }
  for (const definition of rules.stats) {
    if (build.stats[definition.id] === undefined) {
      problems.push({ code: "MISSING_STAT", statId: definition.id });
    }
  }

  const allSelections = [...build.equipmentIds, ...build.skillIds];
  for (const id of new Set(allSelections)) {
    if (allSelections.filter((selected) => selected === id).length > 1) {
      problems.push({ code: "DUPLICATE_SELECTION", optionId: id });
    }
  }

  const equipmentById = new Map(rules.equipment.map((option) => [option.id, option]));
  const bySlot = new Map<number, number[]>();
  for (const id of build.equipmentIds) {
    const slotId = equipmentById.get(id)?.slotId;
    if (!slotId) continue;
    bySlot.set(slotId, [...(bySlot.get(slotId) ?? []), id]);
  }
  for (const [slotId, optionIds] of bySlot) {
    if (optionIds.length > 1) problems.push({ code: "SLOT_CONFLICT", slotId, optionIds });
  }

  if (rules.maxSkills !== undefined && build.skillIds.length > rules.maxSkills) {
    problems.push({ code: "TOO_MANY_SKILLS", actual: build.skillIds.length, maximum: rules.maxSkills });
  }

  const selectedOptions = [...rules.equipment, ...rules.skills].filter((option) => allSelections.includes(option.id));
  const grantedActions = new Set(selectedOptions.flatMap((option) => option.grantedActionIds ?? []));
  if (!build.defaultActionId || !grantedActions.has(build.defaultActionId)) {
    problems.push({ code: "DEFAULT_ACTION_UNAVAILABLE", actionId: build.defaultActionId });
  }

  let cost: number | null = null;
  if (!problems.some((problem) => problem.code === "STAT_OUT_OF_RANGE")) {
    cost = calculateBuildCost(build, rules);
  }

  if (cost !== null && cost > rules.buildBudget) {
    problems.push({ code: "OVER_BUDGET", actual: cost, maximum: rules.buildBudget });
  }

  if (build.tactics.length > rules.maxTactics) {
    problems.push({ code: "TOO_MANY_TACTICS", actual: build.tactics.length, maximum: rules.maxTactics });
  }

  return problems.concat(
    validateOptions(build, build.equipmentIds, rules.equipment),
    validateOptions(build, build.skillIds, rules.skills),
  );
}
