import { protocolId } from "../domain/ids";
import type { DuelInput } from "../domain/duel";

export const STARTER_DUEL: DuelInput = {
  seed: 73,
  fighters: [
    {
      id: protocolId(1001),
      name: "Fighter One",
      maxHealth: 30,
      defaultAction: {
        id: protocolId(2001),
        windup: 30,
        recovery: 20,
        accuracy: 0.8,
        tags: ["attack", "melee", "quick"],
        effects: [{ type: "damage", target: "target", amount: 7, tags: ["physical"] }],
      },
    },
    {
      id: protocolId(1002),
      name: "Fighter Two",
      maxHealth: 34,
      defaultAction: {
        id: protocolId(2002),
        windup: 45,
        recovery: 25,
        accuracy: 0.9,
        tags: ["attack", "melee", "heavy"],
        effects: [{ type: "damage", target: "target", amount: 10, tags: ["physical"] }],
      },
    },
  ],
};
