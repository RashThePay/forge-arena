import { describe, expect, it } from "vitest";
import { STARTER_BUILD } from "../content/starter-build";
import { STARTER_RULES } from "../content/starter-rules";
import { encodeBuild } from "./build-code";
import { BattleSetupError, runBuildCodeDuel } from "./battle-session";

describe("build-code battle session", () => {
  it("decodes, validates, compiles, and resolves two shared builds", () => {
    const code = encodeBuild(STARTER_BUILD);
    const duel = runBuildCodeDuel(code, code, STARTER_RULES);
    expect(duel.result.winnerId).not.toBeNull();
    expect(duel.finalHealth[duel.result.winnerId!]).toBeGreaterThan(0);
    expect(Object.values(duel.finalHealth)).toContain(0);
  });

  it("identifies which code slot rejected malformed input", () => {
    const code = encodeBuild(STARTER_BUILD);
    expect(() => runBuildCodeDuel(code, "not-a-build", STARTER_RULES)).toThrowError(BattleSetupError);
    try { runBuildCodeDuel(code, "not-a-build", STARTER_RULES); } catch (error) {
      expect(error).toMatchObject({ side: "right" });
    }
  });
});
