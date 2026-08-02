import { describe, expect, it } from "vitest";

import {
  ENERGIZED_STREAK_DAYS,
  WEARY_BREAK_GAP_MS,
  WEARY_COMPLETED_TODAY,
  computeMood,
  type MoodInput,
} from "../src/core/mood";

function input(extra: Partial<MoodInput> = {}): MoodInput {
  return { completedToday: 1, currentStreak: 0, msSinceBreak: 0, ...extra };
}

describe("computeMood", () => {
  it("defaults to steady", () => {
    expect(computeMood(input())).toBe("steady");
  });

  it("goes weary after too long without a real break", () => {
    expect(computeMood(input({ msSinceBreak: WEARY_BREAK_GAP_MS - 1 }))).toBe("steady");
    expect(computeMood(input({ msSinceBreak: WEARY_BREAK_GAP_MS }))).toBe("weary");
  });

  it("goes weary after enough pomodoros in one day, break or no break", () => {
    expect(computeMood(input({ completedToday: WEARY_COMPLETED_TODAY - 1 }))).toBe("steady");
    expect(computeMood(input({ completedToday: WEARY_COMPLETED_TODAY }))).toBe("weary");
  });

  it("goes energized on a long enough streak", () => {
    expect(computeMood(input({ currentStreak: ENERGIZED_STREAK_DAYS - 1 }))).toBe("steady");
    expect(computeMood(input({ currentStreak: ENERGIZED_STREAK_DAYS }))).toBe("energized");
  });

  it("weary wins over a good streak -- tiredness is the more urgent thing to notice", () => {
    expect(
      computeMood(
        input({ currentStreak: ENERGIZED_STREAK_DAYS, msSinceBreak: WEARY_BREAK_GAP_MS }),
      ),
    ).toBe("weary");
  });
});
