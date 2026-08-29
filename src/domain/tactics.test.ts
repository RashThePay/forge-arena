import { describe, expect, it } from "vitest";
import { createResourceState, type CombatantState } from "./combat-state";
import type { ActionDefinition } from "./content";
import { protocolId } from "./ids";
import { selectTactic, type CompiledTactic } from "./tactics";

const BASIC: ActionDefinition = {
  id: protocolId(1), tags: ["attack"], windup: 10, recovery: 10, accuracy: 1,
  effects: [{ type: "damage", target: "target", amount: 2 }],
};
const FINISHER: ActionDefinition = {
  id: protocolId(2), tags: ["attack", "heavy"], windup: 20, recovery: 20, accuracy: 1,
  costs: [{ resourceId: protocolId(50), amount: 2 }],
  effects: [{ type: "damage", target: "target", amount: 8 }],
};

function fighter(id: number, health = 20, resource = 2): CombatantState {
  return {
    id: protocolId(id), name: `Fighter ${id}`, maxHealth: 20, health,
    resources: createResourceState([{ id: protocolId(50), key: "momentum", maximum: 3, initial: resource }]),
    statuses: new Map(),
  };
}

function lowHealthTactic(action = FINISHER): CompiledTactic {
  return {
    condition: { id: protocolId(10), key: "target-low", predicate: { type: "healthBelow", subject: "target", ratio: 0.4 } },
    action,
    targetRule: { id: protocolId(20), key: "opponent", type: "opponent" },
  };
}

describe("tactic selection", () => {
  it("selects the first matching usable rule", () => {
    const result = selectTactic(fighter(100), fighter(101, 5), BASIC, [lowHealthTactic()], null);
    expect(result.action.id).toBe(FINISHER.id);
    expect(result.tacticIndex).toBe(0);
    expect(result.evaluations).toHaveLength(1);
  });

  it("falls back when a condition does not match", () => {
    const result = selectTactic(fighter(100), fighter(101, 20), BASIC, [lowHealthTactic()], null);
    expect(result.action.id).toBe(BASIC.id);
    expect(result.evaluations[0]).toMatchObject({ matched: false, usable: false });
  });

  it("continues after a matching action is unaffordable", () => {
    const result = selectTactic(fighter(100, 20, 0), fighter(101, 5), BASIC, [lowHealthTactic()], null);
    expect(result.action.id).toBe(BASIC.id);
    expect(result.evaluations[0]).toMatchObject({ matched: true, usable: false });
  });

  it("can react to an opponent action tag during its windup", () => {
    const counter: CompiledTactic = {
      condition: { id: protocolId(11), key: "counter-heavy", predicate: { type: "targetActionTagged", tag: "heavy" } },
      action: BASIC,
      targetRule: { id: protocolId(20), key: "opponent", type: "opponent" },
    };
    expect(selectTactic(fighter(100), fighter(101), FINISHER, [counter], FINISHER).tacticIndex).toBe(0);
  });
});
