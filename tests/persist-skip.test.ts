import { describe, expect, it } from "vitest";

import { preferencesUnchanged, withCompletedToday } from "../src/core/persist-skip";

describe("withCompletedToday", () => {
  it("returns the same object when the tally has not moved", () => {
    const preferences = { completedToday: 2, themeId: "terminal" };
    expect(withCompletedToday(preferences, 2)).toBe(preferences);
  });

  it("allocates a new object only when the tally changed", () => {
    const preferences = { completedToday: 2, themeId: "terminal" };
    const next = withCompletedToday(preferences, 3);
    expect(next).not.toBe(preferences);
    expect(next).toEqual({ completedToday: 3, themeId: "terminal" });
    expect(preferences.completedToday).toBe(2);
  });
});

describe("preferencesUnchanged", () => {
  it("is a reference check, not a deep compare", () => {
    const saved = { completedToday: 1 };
    expect(preferencesUnchanged(saved, saved)).toBe(true);
    expect(preferencesUnchanged({ completedToday: 1 }, saved)).toBe(false);
  });
});
