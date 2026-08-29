import type { ResourceDefinition, StatusDefinition } from "./content";
import type { ProtocolId } from "./ids";

export type ResourceState = {
  definition: ResourceDefinition;
  current: number;
};

export type StatusState = {
  definition: StatusDefinition;
  stacks: number;
};

export type CombatantState = {
  id: ProtocolId;
  name: string;
  maxHealth: number;
  health: number;
  resources: Map<ProtocolId, ResourceState>;
  statuses: Map<ProtocolId, StatusState>;
};

export function createResourceState(definitions: readonly ResourceDefinition[] = []): Map<ProtocolId, ResourceState> {
  return new Map(definitions.map((definition) => [
    definition.id,
    { definition, current: Math.min(definition.initial, definition.maximum) },
  ]));
}
