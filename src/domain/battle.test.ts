import { describe, expect, it } from "vitest";
import { compareScheduledEvents, type ScheduledEvent } from "./battle";

describe("event timeline", () => {
  it("uses insertion sequence to resolve simultaneous events deterministically", () => {
    const events = [
      { at: 20, sequence: 2 },
      { at: 10, sequence: 3 },
      { at: 20, sequence: 1 },
    ] as ScheduledEvent[];

    expect(events.sort(compareScheduledEvents).map(({ at, sequence }) => [at, sequence])).toEqual([
      [10, 3],
      [20, 1],
      [20, 2],
    ]);
  });
});
