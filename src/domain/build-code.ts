import { protocolId, type ProtocolId } from "./ids";
import type { Build, TacticRule } from "./model";

const PREFIX = "FA1.";
const FORMAT_VERSION = 1;
const CHECKSUM_BYTES = 4;
const MAX_COLLECTION_LENGTH = 1_000;
const MAX_NAME_BYTES = 256;

export type BuildCodeErrorCode =
  | "INVALID_PREFIX"
  | "INVALID_BASE64"
  | "TRUNCATED"
  | "CHECKSUM_MISMATCH"
  | "UNSUPPORTED_VERSION"
  | "INVALID_VALUE"
  | "TRAILING_DATA";

export class BuildCodeError extends Error {
  constructor(public readonly code: BuildCodeErrorCode, message: string) {
    super(message);
    this.name = "BuildCodeError";
  }
}

function assertUnsigned(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new BuildCodeError("INVALID_VALUE", `${label} must be a non-negative safe integer`);
  }
}

export function encodeVarint(value: number): number[] {
  assertUnsigned(value, "Varint");
  const bytes: number[] = [];
  let remaining = value;
  do {
    const byte = remaining % 128;
    remaining = Math.floor(remaining / 128);
    bytes.push(byte + (remaining > 0 ? 128 : 0));
  } while (remaining > 0);
  return bytes;
}

function decodeVarint(bytes: Uint8Array, start: number): { value: number; offset: number } {
  let value = 0;
  let multiplier = 1;
  let offset = start;

  while (offset < bytes.length) {
    const byte = bytes[offset++];
    value += (byte & 0x7f) * multiplier;
    if (!Number.isSafeInteger(value)) throw new BuildCodeError("INVALID_VALUE", "Varint exceeds safe integer range");
    if ((byte & 0x80) === 0) return { value, offset };
    multiplier *= 128;
    if (!Number.isSafeInteger(multiplier)) throw new BuildCodeError("INVALID_VALUE", "Varint is too long");
  }
  throw new BuildCodeError("TRUNCATED", "Build code ends inside a varint");
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new BuildCodeError("INVALID_BASE64", "Build code contains invalid Base64URL characters");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new BuildCodeError("INVALID_BASE64", "Build code contains invalid Base64URL data");
  }
}

function sortedEntries(record: Readonly<Record<number, number>>): [number, number][] {
  return Object.entries(record)
    .map(([key, value]) => [Number(key), value] as [number, number])
    .sort(([left], [right]) => left - right);
}

function pushList(target: number[], values: readonly number[]): void {
  target.push(...encodeVarint(values.length));
  for (const value of values) target.push(...encodeVarint(value));
}

export function encodeBuild(build: Build): string {
  if (build.formatVersion !== FORMAT_VERSION) {
    throw new BuildCodeError("UNSUPPORTED_VERSION", `Cannot encode build format ${build.formatVersion}`);
  }
  const bytes: number[] = [];
  bytes.push(...encodeVarint(FORMAT_VERSION), ...encodeVarint(build.rulesetVersion));

  const name = new TextEncoder().encode(build.name);
  if (name.length > MAX_NAME_BYTES) throw new BuildCodeError("INVALID_VALUE", `Build name exceeds ${MAX_NAME_BYTES} UTF-8 bytes`);
  bytes.push(...encodeVarint(name.length), ...name);

  const stats = sortedEntries(build.stats);
  bytes.push(...encodeVarint(stats.length));
  for (const [id, value] of stats) bytes.push(...encodeVarint(id), ...encodeVarint(value));

  pushList(bytes, [...build.equipmentIds].sort((a, b) => a - b));
  pushList(bytes, [...build.skillIds].sort((a, b) => a - b));
  bytes.push(...encodeVarint(build.defaultActionId ?? 0));

  bytes.push(...encodeVarint(build.tactics.length));
  for (const tactic of build.tactics) {
    bytes.push(...encodeVarint(tactic.conditionId), ...encodeVarint(tactic.actionId), ...encodeVarint(tactic.targetRuleId));
  }

  const appearance = sortedEntries(build.appearance);
  bytes.push(...encodeVarint(appearance.length));
  for (const [slotId, assetId] of appearance) bytes.push(...encodeVarint(slotId), ...encodeVarint(assetId));

  const payload = Uint8Array.from(bytes);
  const checksum = crc32(payload);
  const envelope = new Uint8Array(payload.length + CHECKSUM_BYTES);
  envelope.set(payload);
  new DataView(envelope.buffer).setUint32(payload.length, checksum, true);
  return PREFIX + toBase64Url(envelope);
}

class Reader {
  offset = 0;
  constructor(readonly bytes: Uint8Array) {}

  integer(label: string): number {
    const decoded = decodeVarint(this.bytes, this.offset);
    this.offset = decoded.offset;
    assertUnsigned(decoded.value, label);
    return decoded.value;
  }

  count(label: string): number {
    const value = this.integer(label);
    if (value > MAX_COLLECTION_LENGTH) throw new BuildCodeError("INVALID_VALUE", `${label} exceeds ${MAX_COLLECTION_LENGTH}`);
    return value;
  }

  protocol(label: string): ProtocolId {
    try {
      return protocolId(this.integer(label));
    } catch {
      throw new BuildCodeError("INVALID_VALUE", `${label} must be a positive protocol ID`);
    }
  }

  raw(length: number): Uint8Array {
    if (this.offset + length > this.bytes.length) throw new BuildCodeError("TRUNCATED", "Build code ends inside a byte field");
    const result = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }
}

function readProtocolList(reader: Reader, label: string): ProtocolId[] {
  const count = reader.count(`${label} count`);
  return Array.from({ length: count }, (_, index) => reader.protocol(`${label} ${index}`));
}

export function decodeBuild(code: string): Build {
  if (!code.startsWith(PREFIX)) throw new BuildCodeError("INVALID_PREFIX", `Build code must start with ${PREFIX}`);
  const envelope = fromBase64Url(code.slice(PREFIX.length));
  if (envelope.length <= CHECKSUM_BYTES) throw new BuildCodeError("TRUNCATED", "Build code is too short");

  const payload = envelope.slice(0, -CHECKSUM_BYTES);
  const expected = new DataView(envelope.buffer, envelope.byteOffset + payload.length, CHECKSUM_BYTES).getUint32(0, true);
  if (crc32(payload) !== expected) throw new BuildCodeError("CHECKSUM_MISMATCH", "Build code checksum does not match");

  const reader = new Reader(payload);
  const formatVersion = reader.integer("Format version");
  if (formatVersion !== FORMAT_VERSION) throw new BuildCodeError("UNSUPPORTED_VERSION", `Unsupported build format ${formatVersion}`);
  const rulesetVersion = reader.integer("Ruleset version");

  const nameLength = reader.count("Name length");
  if (nameLength > MAX_NAME_BYTES) throw new BuildCodeError("INVALID_VALUE", `Build name exceeds ${MAX_NAME_BYTES} UTF-8 bytes`);
  let name: string;
  try {
    name = new TextDecoder("utf-8", { fatal: true }).decode(reader.raw(nameLength));
  } catch {
    throw new BuildCodeError("INVALID_VALUE", "Build name is not valid UTF-8");
  }

  const stats: Record<number, number> = {};
  for (let index = 0, count = reader.count("Stat count"); index < count; index += 1) {
    stats[reader.protocol(`Stat ID ${index}`)] = reader.integer(`Stat value ${index}`);
  }

  const equipmentIds = readProtocolList(reader, "Equipment");
  const skillIds = readProtocolList(reader, "Skill");
  const defaultRaw = reader.integer("Default action");
  const defaultActionId = defaultRaw === 0 ? undefined : protocolId(defaultRaw);

  const tactics: TacticRule[] = [];
  for (let index = 0, count = reader.count("Tactic count"); index < count; index += 1) {
    tactics.push({
      conditionId: reader.protocol(`Tactic condition ${index}`),
      actionId: reader.protocol(`Tactic action ${index}`),
      targetRuleId: reader.protocol(`Tactic target ${index}`),
    });
  }

  const appearance: Record<number, ProtocolId> = {};
  for (let index = 0, count = reader.count("Appearance count"); index < count; index += 1) {
    appearance[reader.protocol(`Appearance slot ${index}`)] = reader.protocol(`Appearance asset ${index}`);
  }
  if (reader.offset !== payload.length) throw new BuildCodeError("TRAILING_DATA", "Build code contains trailing payload data");

  return { formatVersion, rulesetVersion, name, stats, equipmentIds, skillIds, defaultActionId, tactics, appearance };
}
