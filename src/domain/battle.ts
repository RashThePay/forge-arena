import type { ProtocolId } from "./ids";

export type BattleTime = number & { readonly __brand: "BattleTime" };

export type BattleEvent =
  | { type: "BATTLE_STARTED"; at: BattleTime; seed: number }
  | { type: "ACTION_SELECTED"; at: BattleTime; actorId: ProtocolId; actionId: ProtocolId; tacticIndex: number | null }
  | { type: "ACTION_STARTED"; at: BattleTime; actorId: ProtocolId; actionId: ProtocolId; resolvesAt: BattleTime }
  | { type: "ACTION_RESOLVED"; at: BattleTime; actorId: ProtocolId; actionId: ProtocolId; targetIds: readonly ProtocolId[] }
  | { type: "DAMAGE_APPLIED"; at: BattleTime; sourceId: ProtocolId; targetId: ProtocolId; amount: number }
  | { type: "CHARACTER_DEFEATED"; at: BattleTime; characterId: ProtocolId }
  | { type: "BATTLE_ENDED"; at: BattleTime; winnerIds: readonly ProtocolId[] };

export type ScheduledEvent = {
  at: BattleTime;
  sequence: number;
  event: BattleEvent;
};

/** Stable ordering makes simultaneous events deterministic. */
export function compareScheduledEvents(a: ScheduledEvent, b: ScheduledEvent): number {
  return a.at - b.at || a.sequence - b.sequence;
}
