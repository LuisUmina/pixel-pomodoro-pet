import { describe, expect, it } from "vitest";

import { advancePetLoopCursor, petLoopShouldRun } from "../src/ui/pet-loop";

describe("advancePetLoopCursor", () => {
  it("walks to the next frame inside a clip", () => {
    expect(advancePetLoopCursor(0, 3, 0, 1)).toEqual({
      frameIndex: 1,
      loopsDone: 0,
      pickNextBehavior: false,
    });
  });

  it("wraps and counts a finished loop", () => {
    expect(advancePetLoopCursor(2, 3, 0, 2)).toEqual({
      frameIndex: 0,
      loopsDone: 1,
      pickNextBehavior: false,
    });
  });

  it("asks for a new behaviour after the last loop", () => {
    expect(advancePetLoopCursor(2, 3, 1, 2)).toEqual({
      frameIndex: 0,
      loopsDone: 2,
      pickNextBehavior: true,
    });
  });

  it("treats a one-frame, one-loop clip as done after the first hold", () => {
    expect(advancePetLoopCursor(0, 1, 0, 1).pickNextBehavior).toBe(true);
  });
});

describe("petLoopShouldRun", () => {
  it("runs only while started and the document is visible", () => {
    expect(petLoopShouldRun(true, false)).toBe(true);
    expect(petLoopShouldRun(true, true)).toBe(false);
    expect(petLoopShouldRun(false, false)).toBe(false);
  });
});
