import { describe, expect, it } from "vitest";
import { battleTime, type BattleEvent } from "./battle";
import { createResourceState, type CombatantState } from "./combat-state";
import type { StatusDefinition } from "./content";
import { resolveEffects } from "./effects";
import { protocolId } from "./ids";

function fighter(id: number): CombatantState {
  return {
    id: protocolId(id), name: `Fighter ${id}`, maxHealth: 20, health: 20,
    resources: createResourceState([{ id: protocolId(30), key: "momentum", maximum: 3, initial: 0 }]),
    statuses: new Map(),
  };
}

describe("content effects", () => {
  it("composes damage, healing, resources, and statuses from data", () => {
    const actor = fighter(1);
    const target = fighter(2);
    const status: StatusDefinition = { id: protocolId(40), key: "exposed", tags: ["debuff"], maxStacks: 2 };
    const events: BattleEvent[] = [];

    resolveEffects([
      { type: "damage", target: "target", amount: 6, tags: ["fire"] },
      { type: "heal", target: "target", amount: 2 },
      { type: "changeResource", target: "actor", resourceId: protocolId(30), amount: 2 },
      { type: "applyStatus", target: "target", status },
    ], { at: battleTime(5), actor, target, events });

    expect(target.health).toBe(16);
    expect(actor.resources.get(protocolId(30))?.current).toBe(2);
    expect(target.statuses.get(protocolId(40))?.stacks).toBe(1);
    expect(events.map((event) => event.type)).toEqual([
      "DAMAGE_APPLIED", "HEAL_APPLIED", "RESOURCE_CHANGED", "STATUS_APPLIED",
    ]);
  });

  it("lets a status react to damage without an engine-specific status check", () => {
    const actor = fighter(1);
    const target = fighter(2);
    const reactive: StatusDefinition = {
      id: protocolId(41), key: "battle-focus", tags: ["buff"], maxStacks: 1,
      triggers: [{
        on: "damageReceived",
        effects: [{ type: "changeResource", target: "actor", resourceId: protocolId(30), amount: 1 }],
      }],
    };
    target.statuses.set(reactive.id, { definition: reactive, stacks: 1 });
    const events: BattleEvent[] = [];

    resolveEffects(
      [{ type: "damage", target: "target", amount: 3 }],
      { at: battleTime(1), actor, target, events },
    );

    expect(target.resources.get(protocolId(30))?.current).toBe(1);
    expect(events.map((event) => event.type)).toEqual(["DAMAGE_APPLIED", "RESOURCE_CHANGED"]);
  });

  it("gives reactive statuses access to the source as their effect target", () => {
    const actor = fighter(1);
    const target = fighter(2);
    const thorns: StatusDefinition = {
      id: protocolId(42), key: "thorns", tags: ["retaliation"], maxStacks: 1,
      triggers: [{
        on: "damageReceived",
        effects: [{ type: "damage", target: "target", amount: 2, tags: ["retaliation"] }],
      }],
    };
    target.statuses.set(thorns.id, { definition: thorns, stacks: 1 });

    resolveEffects(
      [{ type: "damage", target: "target", amount: 3 }],
      { at: battleTime(1), actor, target, events: [] },
    );

    expect(actor.health).toBe(18);
    expect(target.health).toBe(17);
  });

  it("caps status stacks and resources according to their definitions", () => {
    const actor = fighter(1);
    const target = fighter(2);
    const status: StatusDefinition = { id: protocolId(40), key: "exposed", tags: [], maxStacks: 2 };
    const effects = [
      { type: "changeResource", target: "actor", resourceId: protocolId(30), amount: 10 } as const,
      { type: "applyStatus", target: "target", status, stacks: 5 } as const,
    ];
    resolveEffects(effects, { at: battleTime(0), actor, target, events: [] });
    expect(actor.resources.get(protocolId(30))?.current).toBe(3);
    expect(target.statuses.get(protocolId(40))?.stacks).toBe(2);
  });
});
