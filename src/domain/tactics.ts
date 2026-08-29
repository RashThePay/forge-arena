import type { CombatantState } from "./combat-state";
import type { ActionDefinition } from "./content";
import type { ProtocolId } from "./ids";

export type ConditionDefinition = {
  id: ProtocolId;
  key: string;
  predicate:
    | { type: "always" }
    | { type: "healthBelow"; subject: "actor" | "target"; ratio: number }
    | { type: "healthAbove"; subject: "actor" | "target"; ratio: number }
    | { type: "hasStatus"; subject: "actor" | "target"; statusId: ProtocolId; minimumStacks?: number }
    | { type: "resourceAtLeast"; subject: "actor" | "target"; resourceId: ProtocolId; amount: number }
    | { type: "targetActionTagged"; tag: string };
};

export type TargetRuleDefinition = {
  id: ProtocolId;
  key: string;
  type: "self" | "opponent";
};

export type CompiledTactic = {
  condition: ConditionDefinition;
  action: ActionDefinition;
  targetRule: TargetRuleDefinition;
};

export type TacticEvaluation = {
  tacticIndex: number;
  tactic: CompiledTactic;
  matched: boolean;
  usable: boolean;
};

export type TacticSelection = {
  action: ActionDefinition;
  target: CombatantState;
  tacticIndex: number | null;
  evaluations: readonly TacticEvaluation[];
};

function subjectOf(subject: "actor" | "target", actor: CombatantState, target: CombatantState): CombatantState {
  return subject === "actor" ? actor : target;
}

export function canAffordAction(actor: CombatantState, action: ActionDefinition): boolean {
  return (action.costs ?? []).every((cost) =>
    (actor.resources.get(cost.resourceId)?.current ?? 0) >= cost.amount,
  );
}

export function evaluateCondition(
  condition: ConditionDefinition,
  actor: CombatantState,
  target: CombatantState,
  targetActiveAction: ActionDefinition | null,
): boolean {
  const predicate = condition.predicate;
  if (predicate.type === "always") return true;
  if (predicate.type === "targetActionTagged") return targetActiveAction?.tags.includes(predicate.tag) ?? false;

  const subject = subjectOf(predicate.subject, actor, target);
  if (predicate.type === "healthBelow") return subject.health / subject.maxHealth < predicate.ratio;
  if (predicate.type === "healthAbove") return subject.health / subject.maxHealth > predicate.ratio;
  if (predicate.type === "hasStatus") {
    return (subject.statuses.get(predicate.statusId)?.stacks ?? 0) >= (predicate.minimumStacks ?? 1);
  }
  return (subject.resources.get(predicate.resourceId)?.current ?? 0) >= predicate.amount;
}

export function selectTactic(
  actor: CombatantState,
  opponent: CombatantState,
  defaultAction: ActionDefinition,
  tactics: readonly CompiledTactic[],
  opponentActiveAction: ActionDefinition | null,
): TacticSelection {
  const evaluations: TacticEvaluation[] = [];
  for (const [tacticIndex, tactic] of tactics.entries()) {
    const target = tactic.targetRule.type === "self" ? actor : opponent;
    const matched = evaluateCondition(tactic.condition, actor, target, opponentActiveAction);
    const usable = matched && canAffordAction(actor, tactic.action);
    evaluations.push({ tacticIndex, tactic, matched, usable });
    if (usable) return { action: tactic.action, target, tacticIndex, evaluations };
  }
  if (!canAffordAction(actor, defaultAction)) {
    throw new Error(`${actor.name} cannot afford its fallback action ${defaultAction.id}`);
  }
  return { action: defaultAction, target: opponent, tacticIndex: null, evaluations };
}
