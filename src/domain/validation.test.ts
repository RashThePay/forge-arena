import { describe, expect, it } from "vitest";
import { protocolId } from "./ids";
import type { Build, RulesContract } from "./model";
import { calculateBuildCost } from "./budget";
import { validateBuild } from "./validation";

const rules: RulesContract = {
  buildBudget: 10,
  maxTactics: 2,
  stats: [
    { id: protocolId(1), key: "precision", label: "Precision", min: 1, max: 3, costByValue: [0, 2, 5] },
  ],
  equipment: [
    {
      id: protocolId(10), key: "dueling-blade", label: "Dueling Blade", budgetCost: 4,
      requirements: [{ statId: protocolId(1), minimum: 2 }],
    },
  ],
  skills: [],
  actions: [],
};

function build(overrides: Partial<Build> = {}): Build {
  return {
    formatVersion: 1,
    rulesetVersion: 1,
    name: "Test Fighter",
    stats: { 1: 1 },
    equipmentIds: [],
    skillIds: [],
    tactics: [],
    appearance: {},
    defaultActionId: protocolId(11),
    ...overrides,
  };
}

describe("build contract", () => {
  it("prices intrinsic stats and selected options", () => {
    expect(calculateBuildCost(build({ stats: { 1: 2 }, equipmentIds: [protocolId(10)] }), rules)).toBe(6);
  });

  it("reports unmet requirements without converting equipment into stat bonuses", () => {
    const problems = validateBuild(build({ equipmentIds: [protocolId(10)] }), rules);
    expect(problems).toContainEqual({
      code: "UNMET_REQUIREMENT",
      optionId: 10,
      requirement: { statId: 1, minimum: 2 },
    });
  });

  it("allows experimentation but marks over-budget builds invalid", () => {
    const expensiveRules = { ...rules, buildBudget: 3 };
    expect(validateBuild(build({ stats: { 1: 3 } }), expensiveRules)).toContainEqual({
      code: "OVER_BUDGET",
      actual: 5,
      maximum: 3,
    });
  });

  it("enforces the free tactic limit", () => {
    const tactic = { conditionId: protocolId(20), actionId: protocolId(21), targetRuleId: protocolId(22) };
    expect(validateBuild(build({ tactics: [tactic, tactic, tactic] }), rules)).toContainEqual({
      code: "TOO_MANY_TACTICS",
      actual: 3,
      maximum: 2,
    });
  });

  it("requires every intrinsic stat to be explicit in the build", () => {
    expect(validateBuild(build({ stats: {} }), rules)).toContainEqual({
      code: "MISSING_STAT",
      statId: 1,
    });
  });
});
