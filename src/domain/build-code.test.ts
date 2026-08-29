import { describe, expect, it } from "vitest";
import { BuildCodeError, decodeBuild, encodeBuild, encodeVarint } from "./build-code";
import { protocolId } from "./ids";
import type { Build } from "./model";

const build: Build = {
  formatVersion: 1,
  rulesetVersion: 7,
  name: "آرش",
  stats: { 2: 4, 1: 3 },
  equipmentIds: [protocolId(400), protocolId(10)],
  skillIds: [protocolId(90), protocolId(30)],
  defaultActionId: protocolId(700),
  tactics: [
    { conditionId: protocolId(100), actionId: protocolId(700), targetRuleId: protocolId(200) },
    { conditionId: protocolId(101), actionId: protocolId(701), targetRuleId: protocolId(201) },
  ],
  appearance: { 2: protocolId(900), 1: protocolId(800) },
};

describe("build code", () => {
  it("round-trips every build field including Unicode names", () => {
    expect(decodeBuild(encodeBuild(build))).toEqual({
      ...build,
      equipmentIds: [protocolId(10), protocolId(400)],
      skillIds: [protocolId(30), protocolId(90)],
      stats: { 1: 3, 2: 4 },
      appearance: { 1: protocolId(800), 2: protocolId(900) },
    });
  });

  it("produces one canonical code regardless of unordered selection insertion order", () => {
    const reordered: Build = {
      ...build,
      stats: { 1: 3, 2: 4 },
      equipmentIds: [...build.equipmentIds].reverse(),
      skillIds: [...build.skillIds].reverse(),
      appearance: { 1: protocolId(800), 2: protocolId(900) },
    };
    expect(encodeBuild(reordered)).toBe(encodeBuild(build));
  });

  it("uses multiple varint bytes only when values require them", () => {
    expect(encodeVarint(127)).toEqual([127]);
    expect(encodeVarint(128)).toEqual([128, 1]);
    expect(encodeVarint(16_384)).toEqual([128, 128, 1]);
  });

  it("detects a changed character through its checksum", () => {
    const code = encodeBuild(build);
    const last = code.at(-1) === "A" ? "B" : "A";
    expect(() => decodeBuild(code.slice(0, -1) + last)).toThrowError(
      expect.objectContaining<Partial<BuildCodeError>>({ code: "CHECKSUM_MISMATCH" }),
    );
  });

  it("rejects unknown prefixes and unsupported encode versions", () => {
    expect(() => decodeBuild("XX1.abc")).toThrowError(expect.objectContaining({ code: "INVALID_PREFIX" }));
    expect(() => encodeBuild({ ...build, formatVersion: 2 })).toThrowError(expect.objectContaining({ code: "UNSUPPORTED_VERSION" }));
  });

  it("rejects names beyond the byte limit", () => {
    expect(() => encodeBuild({ ...build, name: "ش".repeat(200) })).toThrowError(
      expect.objectContaining({ code: "INVALID_VALUE" }),
    );
  });
});
