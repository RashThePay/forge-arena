import { describe, expect, it } from "vitest";
import { calculateBuildCost } from "../domain/budget";
import { compileBuild } from "../domain/build-compiler";
import { simulateDuel } from "../domain/duel";
import { protocolId } from "../domain/ids";
import { validateBuild } from "../domain/validation";
import { STARTER_BUILD } from "./starter-build";
import { STARTER_RULES } from "./starter-rules";

describe("starter builder content", () => {
  it("produces a legal, affordable fighter that can finish a trial duel", () => {
    expect(validateBuild(STARTER_BUILD, STARTER_RULES)).toEqual([]);
    expect(calculateBuildCost(STARTER_BUILD, STARTER_RULES)).toBeLessThanOrEqual(STARTER_RULES.buildBudget);

    const fighter = compileBuild(STARTER_BUILD, STARTER_RULES, protocolId(9001));
    const rival = { ...fighter, id: protocolId(9002), name: "Arena Echo" };
    const result = simulateDuel({ seed: 73, fighters: [fighter, rival] });

    expect(result.winnerId).toBeDefined();
    expect(result.events.at(-1)?.type).toBe("BATTLE_ENDED");
  });
});
