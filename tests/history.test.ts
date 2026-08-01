import { describe, expect, it } from "vitest";

import {
  INITIAL_HISTORY,
  RETENTION_DAYS,
  currentStreak,
  heatLevel,
  heatmap,
  recordSession,
  shiftIsoDay,
  type HistoryState,
} from "../src/core/history";
import { memoryStore } from "../src/store/persistence";
import { loadHistory, saveHistory } from "../src/store/history";

// All Mondays, chosen so the "one rest day per week" boundary is easy to
// reason about by eye.
const MON1 = "2026-06-01";
const TUE1 = "2026-06-02";
const WED1 = "2026-06-03";
const THU1 = "2026-06-04";
const FRI1 = "2026-06-05";
const SAT1 = "2026-06-06";
const SUN1 = "2026-06-07";
const TUE2 = "2026-06-09";

function record(days: readonly string[]): HistoryState {
  return days.reduce((state, day) => recordSession(state, day), INITIAL_HISTORY);
}

describe("recordSession", () => {
  it("counts a session against its day", () => {
    const state = recordSession(INITIAL_HISTORY, MON1);

    expect(state.days[MON1]).toBe(1);
    expect(state.totalSessions).toBe(1);
  });

  it("accumulates more than one session on the same day", () => {
    const state = record([MON1, MON1, MON1]);

    expect(state.days[MON1]).toBe(3);
    expect(state.totalSessions).toBe(3);
  });

  it("never prunes the all-time total, only the day-by-day log", () => {
    const farApart = record(["2020-01-01", "2026-06-01"]);

    expect(farApart.totalSessions).toBe(2);
    expect(farApart.days["2020-01-01"]).toBeUndefined();
    expect(farApart.days["2026-06-01"]).toBe(1);
  });

  it("tracks the best single day and which day set it", () => {
    const state = record([MON1, MON1, MON1, TUE1]);

    expect(state.bestDayCount).toBe(3);
    expect(state.bestDay).toBe(MON1);
  });

  it("keeps the original record day when a later day only ties it", () => {
    const state = record([MON1, MON1, TUE1, TUE1]);

    // Tuesday matched Monday's count but did not beat it.
    expect(state.bestDayCount).toBe(2);
    expect(state.bestDay).toBe(MON1);
  });

  it("tracks the best rolling 7-day total", () => {
    const state = record([MON1, TUE1, WED1, THU1, FRI1, SAT1, SUN1]);

    expect(state.bestWeekCount).toBe(7);
  });

  it("tracks the best streak ever, even after it later breaks", () => {
    const streak5 = record([MON1, TUE1, WED1, THU1, FRI1]);
    // A four-day gap (already past its one weekly grace day) breaks it.
    const broken = record([MON1, TUE1, WED1, THU1, FRI1, "2026-06-10"]);

    expect(streak5.bestStreak).toBe(5);
    expect(broken.bestStreak).toBe(5);
  });
});

describe("currentStreak", () => {
  it("is zero with nothing recorded", () => {
    expect(currentStreak({}, MON1)).toBe(0);
  });

  it("counts consecutive worked days", () => {
    const state = record([MON1, TUE1, WED1]);

    expect(currentStreak(state.days, WED1)).toBe(3);
  });

  it("does not break the streak on a day still in progress", () => {
    // Worked Mon-Wed; asking about Thursday, which has nothing logged yet.
    const state = record([MON1, TUE1, WED1]);

    expect(currentStreak(state.days, THU1)).toBe(3);
  });

  it("forgives exactly one gap day within a week", () => {
    // Worked Mon, Tue, skipped Wed, worked Thu.
    const state = record([MON1, TUE1, THU1]);

    expect(currentStreak(state.days, THU1)).toBe(3);
  });

  it("breaks on a second gap day in the same week", () => {
    // Worked Mon, skipped Tue and Wed, worked Thu.
    const state = record([MON1, THU1]);

    // Only Thursday survives: the second gap (Wed) used up the week's grace
    // and broke the run Monday started.
    expect(currentStreak(state.days, THU1)).toBe(1);
  });

  it("gives each week its own fresh rest day", () => {
    // Skip Wed of week 1 (forgiven) and skip Mon of week 2 (a new week, a
    // new grace day) but otherwise work every day.
    const worked = [TUE1, THU1, FRI1, SAT1, SUN1, TUE2];
    const state = record(worked);

    expect(currentStreak(state.days, TUE2)).toBe(6);
  });

  it("resets to the days since the break, not to zero forever", () => {
    // Two-day gap breaks the streak, then three fresh days follow.
    const state = record([MON1, "2026-06-10", "2026-06-11", "2026-06-12"]);

    expect(currentStreak(state.days, "2026-06-12")).toBe(3);
  });

  it("respects a custom rest-day budget", () => {
    const state = record([MON1, WED1]); // Tuesday skipped

    expect(currentStreak(state.days, WED1, 0)).toBe(1);
    expect(currentStreak(state.days, WED1, 1)).toBe(2);
  });

  it("never grows past the retention window", () => {
    const days: Record<string, number> = {};
    let cursor = MON1;
    for (let i = 0; i < RETENTION_DAYS + 30; i += 1) {
      days[cursor] = 1;
      cursor = shiftIsoDay(cursor, -1);
    }

    expect(currentStreak(days, MON1)).toBeLessThanOrEqual(RETENTION_DAYS);
  });
});

describe("heatmap", () => {
  it("returns one cell per day in the span, oldest first", () => {
    const state = record([MON1]);
    const cells = heatmap(state.days, MON1, 3);

    expect(cells.map((cell) => cell.day)).toEqual(["2026-05-30", "2026-05-31", MON1]);
    expect(cells[2]?.count).toBe(1);
    expect(cells[0]?.count).toBe(0);
  });

  it("defaults to the full retention window", () => {
    expect(heatmap({}, MON1)).toHaveLength(RETENTION_DAYS);
  });
});

describe("heatLevel", () => {
  it("buckets counts into five shades", () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(2)).toBe(2);
    expect(heatLevel(3)).toBe(3);
    expect(heatLevel(4)).toBe(3);
    expect(heatLevel(5)).toBe(4);
    expect(heatLevel(99)).toBe(4);
  });
});

describe("store/history", () => {
  it("round-trips through a store", () => {
    const store = memoryStore();
    const state = record([MON1, MON1, TUE1]);

    saveHistory(store, state);

    expect(loadHistory(store)).toEqual(state);
  });

  it("falls back to the initial state when nothing is stored", () => {
    expect(loadHistory(memoryStore())).toEqual(INITIAL_HISTORY);
  });

  it("falls back when the stored value is not an object", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:history", "garbage");

    expect(loadHistory(store)).toEqual(INITIAL_HISTORY);
  });

  it("drops a malformed day key or a non-positive count", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:history", {
      days: { [MON1]: 3, "not-a-day": 5, [TUE1]: 0, [WED1]: -2, [THU1]: "nope" },
      totalSessions: 3,
      bestDayCount: 3,
      bestDay: MON1,
      bestWeekCount: 3,
      bestStreak: 1,
    });

    expect(loadHistory(store).days).toEqual({ [MON1]: 3 });
  });

  it("drops a bestDay that is not a well-formed ISO day", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:history", { bestDay: "not-a-day" });

    expect(loadHistory(store).bestDay).toBe("");
  });

  it("floors and clamps negative or fractional counters", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:history", {
      totalSessions: -5,
      bestDayCount: 2.9,
      bestWeekCount: Number.NaN,
      bestStreak: Number.POSITIVE_INFINITY,
    });

    const loaded = loadHistory(store);
    expect(loaded.totalSessions).toBe(0);
    expect(loaded.bestDayCount).toBe(2);
    expect(loaded.bestWeekCount).toBe(0);
    expect(loaded.bestStreak).toBe(0);
  });
});
