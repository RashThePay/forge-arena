import type { BattleEvent, BattleTime } from "./battle";
import type { CombatantState } from "./combat-state";
import type { EffectDefinition, EffectTarget, TriggerEvent } from "./content";

export type EffectContext = {
  at: BattleTime;
  actor: CombatantState;
  target: CombatantState;
  events: BattleEvent[];
};

const MAX_TRIGGER_DEPTH = 32;

function recipient(context: EffectContext, target: EffectTarget): CombatantState {
  return target === "actor" ? context.actor : context.target;
}

function emitTriggers(context: EffectContext, owner: CombatantState, event: TriggerEvent, depth: number): void {
  if (depth > MAX_TRIGGER_DEPTH) throw new Error("Effect trigger depth exceeded; check for a recursive trigger loop");

  for (const status of owner.statuses.values()) {
    for (const trigger of status.definition.triggers ?? []) {
      if (trigger.on !== event) continue;
      const counterpart = owner.id === context.actor.id ? context.target : context.actor;
      resolveEffects(trigger.effects, { ...context, actor: owner, target: counterpart }, depth + 1);
    }
  }
}

export function resolveEffects(
  effects: readonly EffectDefinition[],
  context: EffectContext,
  depth = 0,
): void {
  for (const effect of effects) {
    const affected = recipient(context, effect.target);

    if (effect.type === "damage") {
      if (affected.health <= 0) continue;
      const amount = Math.min(effect.amount, affected.health);
      affected.health -= amount;
      context.events.push({
        type: "DAMAGE_APPLIED", at: context.at, sourceId: context.actor.id,
        targetId: affected.id, amount, tags: effect.tags ?? [],
      });
      emitTriggers(context, affected, "damageReceived", depth);
      continue;
    }

    if (effect.type === "heal") {
      if (affected.health <= 0) continue;
      const amount = Math.min(effect.amount, affected.maxHealth - affected.health);
      if (amount <= 0) continue;
      affected.health += amount;
      context.events.push({ type: "HEAL_APPLIED", at: context.at, sourceId: context.actor.id, targetId: affected.id, amount });
      continue;
    }

    if (effect.type === "changeResource") {
      const resource = affected.resources.get(effect.resourceId);
      if (!resource) throw new Error(`Combatant ${affected.id} does not have resource ${effect.resourceId}`);
      const previous = resource.current;
      resource.current = Math.max(0, Math.min(resource.definition.maximum, previous + effect.amount));
      context.events.push({
        type: "RESOURCE_CHANGED", at: context.at, characterId: affected.id,
        resourceId: effect.resourceId, previous, current: resource.current,
      });
      continue;
    }

    const existing = affected.statuses.get(effect.status.id);
    const stacks = Math.min(
      effect.status.maxStacks,
      (existing?.stacks ?? 0) + (effect.stacks ?? 1),
    );
    affected.statuses.set(effect.status.id, { definition: effect.status, stacks });
    context.events.push({ type: "STATUS_APPLIED", at: context.at, sourceId: context.actor.id, targetId: affected.id, statusId: effect.status.id, stacks });
  }
}

export function emitActionResolvedTriggers(context: EffectContext): void {
  emitTriggers(context, context.actor, "actionResolved", 0);
}
