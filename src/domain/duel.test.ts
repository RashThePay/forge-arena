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
          defaultAction: { id: protocolId(11), windup: 5, recovery: 5, accuracy: 1, damage: 2 },
        },
        {
          id: protocolId(2), name: "Slow", maxHealth: 20,
          defaultAction: { id: protocolId(12), windup: 15, recovery: 10, accuracy: 1, damage: 5 },
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
          defaultAction: { id: protocolId(11), windup: 1, recovery: 1, accuracy: 0, damage: 100 },
        },
        {
          id: protocolId(2), name: "Always Hits", maxHealth: 5,
          defaultAction: { id: protocolId(12), windup: 2, recovery: 1, accuracy: 1, damage: 5 },
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
});
