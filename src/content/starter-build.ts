import type { Build, TacticRule } from "../domain/model";
import { IDS } from "./starter-rules";
import { DEFAULT_APPEARANCE } from "./appearance";

export const STARTER_TACTICS: TacticRule[] = [
  { conditionId: IDS.conditions.selfLow, actionId: IDS.actions.recover, targetRuleId: IDS.targets.self },
  { conditionId: IDS.conditions.targetLow, actionId: IDS.actions.powerStrike, targetRuleId: IDS.targets.opponent },
  { conditionId: IDS.conditions.always, actionId: IDS.actions.quickCut, targetRuleId: IDS.targets.opponent },
];

export const STARTER_BUILD: Build = {
  formatVersion: 1,
  rulesetVersion: 1,
  name: "Ashen Blade",
  stats: {
    [IDS.stats.power]: 3,
    [IDS.stats.precision]: 3,
    [IDS.stats.speed]: 2,
    [IDS.stats.endurance]: 3,
    [IDS.stats.resolve]: 2,
  },
  equipmentIds: [
    IDS.equipment.longsword,
    IDS.equipment.buckler,
    IDS.equipment.leather,
    IDS.equipment.ember,
  ],
  skillIds: [IDS.skills.powerStrike, IDS.skills.recover, IDS.skills.quickCut],
  defaultActionId: IDS.actions.sword,
  tactics: STARTER_TACTICS,
  appearance: DEFAULT_APPEARANCE,
};
