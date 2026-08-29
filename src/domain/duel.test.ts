import { describe, expect, it } from "vitest";
import { STARTER_DUEL } from "../content/starter-duel";
import { battleTime } from "./battle";
import { simulateDuel } from "./duel";
import { protocolId } from "./ids";

describe("duel engine", () => {
  it("is exactly reproducible from its input and seed", () => {
    expect(simulateDuel(STARTER_DUEL)).toEqual(simulateDuel(STARTER_DUEL));
  });

  it("advances through windup and recovery rather than alternating turns", () => {
    const result = simulateDuel({
      seed: 1,
      fighters: [
        {
          id: protocolId(1), name: "Quick", maxHealth: 20,
          defaultAction: { id: protocolId(11), tags: ["quick"], windup: 5, recovery: 5, accuracy: 1, effects: [{ type: "damage", target: "target", amount: 2 }] },
        },
        {
          id: protocolId(2), name: "Slow", maxHealth: 20,
          defaultAction: { id: protocolId(12), tags: ["heavy"], windup: 15, recovery: 10, accuracy: 1, effects: [{ type: "damage", target: "target", amount: 5 }] },
        },
      ],
    });

    const resolutions = result.events.filter((event) => event.type === "ACTION_RESOLVED");
    expect(resolutions.slice(0, 3).map((event) => [event.actorId, event.at])).toEqual([
      [protocolId(1), battleTime(5)],
      [protocolId(2), battleTime(15)],
      [protocolId(1), battleTime(15)],
    ]);
  });

  it("records misses without applying damage", () => {
    const result = simulateDuel({
      seed: 1,
      fighters: [
        {
          id: protocolId(1), name: "Never Hits", maxHealth: 5,
          defaultAction: { id: protocolId(11), tags: [], windup: 1, recovery: 1, accuracy: 0, effects: [{ type: "damage", target: "target", amount: 100 }] },
        },
        {
          id: protocolId(2), name: "Always Hits", maxHealth: 5,
          defaultAction: { id: protocolId(12), tags: [], windup: 2, recovery: 1, accuracy: 1, effects: [{ type: "damage", target: "target", amount: 5 }] },
        },
      ],
    });

    expect(result.winnerId).toBe(protocolId(2));
    expect(result.events).toContainEqual({
      type: "ACTION_RESOLVED", at: battleTime(1), actorId: protocolId(1),
      actionId: protocolId(11), targetIds: [protocolId(2)], hit: false,
    });
    expect(result.events.some((event) => event.type === "DAMAGE_APPLIED" && event.sourceId === protocolId(1))).toBe(false);
  });

  it("rejects zero-time actions before they can create an infinite loop", () => {
    const invalid = structuredClone(STARTER_DUEL);
    invalid.fighters[0].defaultAction.windup = 0;
    invalid.fighters[0].defaultAction.recovery = 0;
    expect(() => simulateDuel(invalid)).toThrow("consume timeline time");
  });

  it("pays declared action resource costs and refuses unaffordable defaults", () => {
    const input = structuredClone(STARTER_DUEL);
    input.fighters[0].resources = [{ id: protocolId(50), key: "focus", maximum: 2, initial: 1 }];
    input.fighters[0].defaultAction.costs = [{ resourceId: protocolId(50), amount: 1 }];
    expect(() => simulateDuel(input)).toThrow("cannot afford its fallback action");
  });

  it("can resolve a victory caused by a data-defined reactive status", () => {
    const input = structuredClone(STARTER_DUEL);
    input.fighters[0].maxHealth = 5;
    input.fighters[0].defaultAction.accuracy = 1;
    input.fighters[0].defaultAction.windup = 1;
    input.fighters[1].statuses = [{
      id: protocolId(60), key: "fatal-thorns", tags: ["retaliation"], maxStacks: 1,
      triggers: [{
        on: "damageReceived",
        effects: [{ type: "damage", target: "target", amount: 5 }],
      }],
    }];

    expect(simulateDuel(input).winnerId).toBe(input.fighters[1].id);
  });

  it("records tactic evaluation and the rule that selected an action", () => {
    const input = structuredClone(STARTER_DUEL);
    const action = input.fighters[0].defaultAction;
    input.fighters[0].tactics = [{
      condition: { id: protocolId(70), key: "always", predicate: { type: "always" } },
      action,
      targetRule: { id: protocolId(71), key: "opponent", type: "opponent" },
    }];
    const result = simulateDuel(input);

    expect(result.events).toContainEqual({
      type: "TACTIC_EVALUATED", at: battleTime(0), actorId: input.fighters[0].id,
      tacticIndex: 0, conditionId: protocolId(70), actionId: action.id,
      matched: true, usable: true,
    });
    expect(result.events).toContainEqual({
      type: "ACTION_SELECTED", at: battleTime(0), actorId: input.fighters[0].id,
      actionId: action.id, tacticIndex: 0,
    });
  });
});
