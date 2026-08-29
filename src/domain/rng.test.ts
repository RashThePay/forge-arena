import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./rng";

describe("seeded random", () => {
  it("replays the same sequence for the same seed", () => {
    const first = createSeededRandom(42);
    const second = createSeededRandom(42);
    expect([first.next(), first.next(), first.next()]).toEqual([second.next(), second.next(), second.next()]);
  });

  it("produces values in the expected interval", () => {
    const random = createSeededRandom(1);
    for (let index = 0; index < 100; index += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
