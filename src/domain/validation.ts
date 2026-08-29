import { calculateBuildCost } from "./budget";
import type { ProtocolId } from "./ids";
import type { Build, CatalogOption, Requirement, RulesContract } from "./model";

export type BuildProblem =
  | { code: "OVER_BUDGET"; actual: number; maximum: number }
  | { code: "TOO_MANY_TACTICS"; actual: number; maximum: number }
  | { code: "UNKNOWN_OPTION"; optionId: number }
  | { code: "UNMET_REQUIREMENT"; optionId: number; requirement: Requirement };

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
  const cost = calculateBuildCost(build, rules);

  if (cost > rules.buildBudget) {
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
