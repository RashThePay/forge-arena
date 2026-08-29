import { compileBuild } from "./build-compiler";
import { decodeBuild } from "./build-code";
import { simulateDuel, type DuelResult } from "./duel";
import { protocolId, type ProtocolId } from "./ids";
import type { Build, RulesContract } from "./model";
import { validateBuild } from "./validation";

export type DuelSide = "left" | "right";

export class BattleSetupError extends Error {
  constructor(public readonly side: DuelSide, message: string) {
    super(message);
    this.name = "BattleSetupError";
  }
}

export type BuildCodeDuel = {
  builds: readonly [Build, Build];
  fighterIds: readonly [ProtocolId, ProtocolId];
  maxHealth: Readonly<Record<number, number>>;
  finalHealth: Readonly<Record<number, number>>;
  result: DuelResult;
};

function readBuild(code: string, side: DuelSide, rules: RulesContract): Build {
  let build: Build;
  try {
    build = decodeBuild(code.trim());
  } catch (error) {
    throw new BattleSetupError(side, error instanceof Error ? error.message : "Invalid build code");
  }
  const problems = validateBuild(build, rules);
  if (problems.length) throw new BattleSetupError(side, `Build rejected: ${problems.map((problem) => problem.code).join(", ")}`);
  return build;
}

export function runBuildCodeDuel(leftCode: string, rightCode: string, rules: RulesContract, seed = 73): BuildCodeDuel {
  const builds = [readBuild(leftCode, "left", rules), readBuild(rightCode, "right", rules)] as const;
  const fighterIds = [protocolId(9101), protocolId(9102)] as const;
  const fighters = builds.map((build, index) => compileBuild(build, rules, fighterIds[index])) as [ReturnType<typeof compileBuild>, ReturnType<typeof compileBuild>];
  const result = simulateDuel({ seed, fighters });
  const maxHealth: Record<number, number> = Object.fromEntries(fighters.map((fighter) => [fighter.id, fighter.maxHealth]));
  const finalHealth = { ...maxHealth };

  for (const event of result.events) {
    if (event.type === "DAMAGE_APPLIED") finalHealth[event.targetId] = Math.max(0, finalHealth[event.targetId] - event.amount);
    if (event.type === "HEAL_APPLIED") finalHealth[event.targetId] = Math.min(maxHealth[event.targetId], finalHealth[event.targetId] + event.amount);
  }
  return { builds, fighterIds, maxHealth, finalHealth, result };
}
