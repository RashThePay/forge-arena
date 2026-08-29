import { battleTime, type BattleEvent, type BattleTime } from "./battle";
import { createResourceState, type CombatantState } from "./combat-state";
import type { ActionDefinition, ResourceDefinition, StatusDefinition } from "./content";
import { emitActionResolvedTriggers, resolveEffects } from "./effects";
import type { ProtocolId } from "./ids";
import { createSeededRandom, type RandomSource } from "./rng";
import { selectTactic, type CompiledTactic } from "./tactics";

export type DuelFighter = {
  id: ProtocolId;
  name: string;
  maxHealth: number;
  defaultAction: ActionDefinition;
  actions?: readonly ActionDefinition[];
  tactics?: readonly CompiledTactic[];
  resources?: readonly ResourceDefinition[];
  statuses?: readonly StatusDefinition[];
};

export type DuelInput = {
  seed: number;
  fighters: readonly [DuelFighter, DuelFighter];
  eventLimit?: number;
};

export type DuelResult = {
  seed: number;
  winnerId: ProtocolId | null;
  elapsed: BattleTime;
  events: readonly BattleEvent[];
};

type FighterState = Omit<DuelFighter, "resources" | "statuses"> & CombatantState & {
  activeAction: ActionDefinition | null;
};

type InternalEvent =
  | { type: "CHOOSE_ACTION"; actorId: ProtocolId }
  | { type: "RESOLVE_ACTION"; actorId: ProtocolId; targetId: ProtocolId; action: ActionDefinition };

type QueueEntry = {
  at: BattleTime;
  sequence: number;
  event: InternalEvent;
};

const DEFAULT_EVENT_LIMIT = 10_000;

function assertAction(action: ActionDefinition): void {
  if (!Number.isInteger(action.windup) || action.windup < 0) throw new Error("Action windup must be a non-negative integer");
  if (!Number.isInteger(action.recovery) || action.recovery < 0) throw new Error("Action recovery must be a non-negative integer");
  if (action.windup + action.recovery === 0) throw new Error("An action must consume timeline time");
  if (action.accuracy < 0 || action.accuracy > 1) throw new Error("Action accuracy must be between 0 and 1");
  if (action.effects.length === 0) throw new Error("An action must define at least one effect");
  for (const cost of action.costs ?? []) {
    if (!Number.isFinite(cost.amount) || cost.amount <= 0) throw new Error("Resource costs must be positive");
  }
}

function assertInput(input: DuelInput): void {
  const [first, second] = input.fighters;
  if (first.id === second.id) throw new Error("Duel fighter IDs must be unique");

  for (const fighter of input.fighters) {
    if (!Number.isFinite(fighter.maxHealth) || fighter.maxHealth <= 0) {
      throw new Error(`${fighter.name} must have positive max health`);
    }
    assertAction(fighter.defaultAction);
  }
}

function enqueue(queue: QueueEntry[], entry: QueueEntry): void {
  queue.push(entry);
  queue.sort((a, b) => a.at - b.at || a.sequence - b.sequence);
}

function opponentOf(fighters: Map<ProtocolId, FighterState>, actorId: ProtocolId): FighterState {
  const target = [...fighters.values()].find((fighter) => fighter.id !== actorId && fighter.health > 0);
  if (!target) throw new Error("No living duel opponent is available");
  return target;
}

function payActionCosts(actor: FighterState, action: ActionDefinition, at: BattleTime, events: BattleEvent[]): void {
  for (const cost of action.costs ?? []) {
    const resource = actor.resources.get(cost.resourceId);
    if (!resource || resource.current < cost.amount) {
      throw new Error(`${actor.name} cannot afford default action ${action.id}`);
    }
  }

  for (const cost of action.costs ?? []) {
    const resource = actor.resources.get(cost.resourceId)!;
    const previous = resource.current;
    resource.current -= cost.amount;
    events.push({
      type: "RESOURCE_CHANGED", at, characterId: actor.id, resourceId: cost.resourceId,
      previous, current: resource.current,
    });
  }
}

export function simulateDuel(input: DuelInput, random: RandomSource = createSeededRandom(input.seed)): DuelResult {
  assertInput(input);

  const fighters = new Map<ProtocolId, FighterState>(input.fighters.map((fighter) => [fighter.id, {
    ...fighter,
    health: fighter.maxHealth,
    resources: createResourceState(fighter.resources),
    statuses: new Map((fighter.statuses ?? []).map((definition) => [definition.id, { definition, stacks: 1 }])),
    activeAction: null as ActionDefinition | null,
  }]));
  const events: BattleEvent[] = [{ type: "BATTLE_STARTED", at: battleTime(0), seed: input.seed }];
  const queue: QueueEntry[] = [];
  let sequence = 0;
  let processed = 0;
  let now = battleTime(0);

  for (const fighter of input.fighters) {
    enqueue(queue, { at: now, sequence: sequence++, event: { type: "CHOOSE_ACTION", actorId: fighter.id } });
  }

  while (queue.length > 0) {
    if (++processed > (input.eventLimit ?? DEFAULT_EVENT_LIMIT)) {
      throw new Error("Duel exceeded its event limit; check for a non-progressing action loop");
    }

    const scheduled = queue.shift()!;
    now = scheduled.at;
    const actor = fighters.get(scheduled.event.actorId);
    if (!actor || actor.health <= 0) continue;

    if (scheduled.event.type === "CHOOSE_ACTION") {
      const opponent = opponentOf(fighters, actor.id);
      const selection = selectTactic(
        actor, opponent, actor.defaultAction, actor.tactics ?? [], opponent.activeAction,
      );
      const { action, target } = selection;
      const resolvesAt = battleTime(now + action.windup);

      payActionCosts(actor, action, now, events);
      for (const evaluation of selection.evaluations) {
        events.push({
          type: "TACTIC_EVALUATED", at: now, actorId: actor.id,
          tacticIndex: evaluation.tacticIndex,
          conditionId: evaluation.tactic.condition.id,
          actionId: evaluation.tactic.action.id,
          matched: evaluation.matched,
          usable: evaluation.usable,
        });
      }
      actor.activeAction = action;
      events.push({
        type: "ACTION_SELECTED", at: now, actorId: actor.id,
        actionId: action.id, tacticIndex: selection.tacticIndex,
      });
      events.push({ type: "ACTION_STARTED", at: now, actorId: actor.id, actionId: action.id, resolvesAt });
      enqueue(queue, {
        at: resolvesAt,
        sequence: sequence++,
        event: { type: "RESOLVE_ACTION", actorId: actor.id, targetId: target.id, action },
      });
      continue;
    }

    const { action, targetId } = scheduled.event;
    actor.activeAction = null;
    const target = fighters.get(targetId);
    if (!target || target.health <= 0) continue;

    const hit = random.next() < action.accuracy;
    events.push({ type: "ACTION_RESOLVED", at: now, actorId: actor.id, actionId: action.id, targetIds: [target.id], hit });

    if (hit) {
      resolveEffects(action.effects, { at: now, actor, target, events });
      emitActionResolvedTriggers({ at: now, actor, target, events });

      const defeated = [actor, target].filter((fighter) => fighter.health <= 0);
      if (defeated.length > 0) {
        for (const fighter of defeated) {
          events.push({ type: "CHARACTER_DEFEATED", at: now, characterId: fighter.id });
        }
        const winnerIds = [actor, target].filter((fighter) => fighter.health > 0).map((fighter) => fighter.id);
        events.push({ type: "BATTLE_ENDED", at: now, winnerIds });
        return { seed: input.seed, winnerId: winnerIds[0] ?? null, elapsed: now, events };
      }
    }

    enqueue(queue, {
      at: battleTime(now + action.recovery),
      sequence: sequence++,
      event: { type: "CHOOSE_ACTION", actorId: actor.id },
    });
  }

  throw new Error("Duel queue emptied without producing a winner");
}
