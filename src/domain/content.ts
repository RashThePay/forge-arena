import type { ProtocolId } from "./ids";

export type ContentTag = string;
export type EffectTarget = "actor" | "target";

export type EffectDefinition =
  | { type: "damage"; target: EffectTarget; amount: number; tags?: readonly ContentTag[] }
  | { type: "heal"; target: EffectTarget; amount: number }
  | { type: "changeResource"; target: EffectTarget; resourceId: ProtocolId; amount: number }
  | { type: "applyStatus"; target: EffectTarget; status: StatusDefinition; stacks?: number };

export type TriggerEvent = "damageReceived" | "actionResolved";

export type TriggerDefinition = {
  on: TriggerEvent;
  effects: readonly EffectDefinition[];
};

export type StatusDefinition = {
  id: ProtocolId;
  key: string;
  tags: readonly ContentTag[];
  maxStacks: number;
  triggers?: readonly TriggerDefinition[];
};

export type ResourceDefinition = {
  id: ProtocolId;
  key: string;
  maximum: number;
  initial: number;
};

export type ResourceCost = {
  resourceId: ProtocolId;
  amount: number;
};

export type ActionDefinition = {
  id: ProtocolId;
  tags: readonly ContentTag[];
  windup: number;
  recovery: number;
  accuracy: number;
  costs?: readonly ResourceCost[];
  effects: readonly EffectDefinition[];
};
