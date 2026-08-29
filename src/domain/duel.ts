import { battleTime, type BattleEvent, type BattleTime } from "./battle";
import type { ProtocolId } from "./ids";
import { createSeededRandom, type RandomSource } from "./rng";

export type DuelAction = {
  id: ProtocolId;
  windup: number;
  recovery: number;
  accuracy: number;
  damage: number;
};

export type DuelFighter = {
  id: ProtocolId;
  name: string;
  maxHealth: number;
  defaultAction: DuelAction;
};

export type DuelInput = {
  seed: number;
  fighters: readonly [DuelFighter, DuelFighter];
  eventLimit?: number;
};

export type DuelResult = {
  seed: number;
  winnerId: ProtocolId;
  elapsed: BattleTime;
  events: readonly BattleEvent[];
};

type FighterState = DuelFighter & { health: number };

type InternalEvent =
  | { type: "CHOOSE_ACTION"; actorId: ProtocolId }
  | { type: "RESOLVE_ACTION"; actorId: ProtocolId; targetId: ProtocolId; action: DuelAction };

type QueueEntry = {
  at: BattleTime;
  sequence: number;
  event: InternalEvent;
};

const DEFAULT_EVENT_LIMIT = 10_000;

function assertAction(action: DuelAction): void {
  if (!Number.isInteger(action.windup) || action.windup < 0) throw new Error("Action windup must be a non-negative integer");
  if (!Number.isInteger(action.recovery) || action.recovery < 0) throw new Error("Action recovery must be a non-negative integer");
  if (action.windup + action.recovery === 0) throw new Error("An action must consume timeline time");
  if (action.accuracy < 0 || action.accuracy > 1) throw new Error("Action accuracy must be between 0 and 1");
  if (!Number.isFinite(action.damage) || action.damage <= 0) throw new Error("Action damage must be positive");
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

export function simulateDuel(input: DuelInput, random: RandomSource = createSeededRandom(input.seed)): DuelResult {
  assertInput(input);

  const fighters = new Map(
    input.fighters.map((fighter) => [fighter.id, { ...fighter, health: fighter.maxHealth }]),
  );
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
      const action = actor.defaultAction;
      const target = opponentOf(fighters, actor.id);
      const resolvesAt = battleTime(now + action.windup);

      events.push({ type: "ACTION_SELECTED", at: now, actorId: actor.id, actionId: action.id, tacticIndex: null });
      events.push({ type: "ACTION_STARTED", at: now, actorId: actor.id, actionId: action.id, resolvesAt });
      enqueue(queue, {
        at: resolvesAt,
        sequence: sequence++,
        event: { type: "RESOLVE_ACTION", actorId: actor.id, targetId: target.id, action },
      });
      continue;
    }

    const { action, targetId } = scheduled.event;
    const target = fighters.get(targetId);
    if (!target || target.health <= 0) continue;

    const hit = random.next() < action.accuracy;
    events.push({ type: "ACTION_RESOLVED", at: now, actorId: actor.id, actionId: action.id, targetIds: [target.id], hit });

    if (hit) {
      const amount = Math.min(action.damage, target.health);
      target.health -= amount;
      events.push({ type: "DAMAGE_APPLIED", at: now, sourceId: actor.id, targetId: target.id, amount });

      if (target.health <= 0) {
        events.push({ type: "CHARACTER_DEFEATED", at: now, characterId: target.id });
        events.push({ type: "BATTLE_ENDED", at: now, winnerIds: [actor.id] });
        return { seed: input.seed, winnerId: actor.id, elapsed: now, events };
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
