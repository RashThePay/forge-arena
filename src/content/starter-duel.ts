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
        damage: 7,
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
        damage: 10,
      },
    },
  ],
};
