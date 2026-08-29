/** Stable IDs used by build-code and persisted battle data. Never reuse one. */
export type ProtocolId = number & { readonly __brand: "ProtocolId" };

export function protocolId(value: number): ProtocolId {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Protocol IDs must be positive safe integers; received ${value}`);
  }
  return value as ProtocolId;
}
