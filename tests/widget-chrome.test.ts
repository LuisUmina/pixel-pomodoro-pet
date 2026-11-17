import { describe, expect, it } from "vitest";

import {
  progressWidthChanged,
  widgetChromeWrites,
  type WidgetChromeFields,
} from "../src/ui/widget-chrome";

function chrome(extra: Partial<WidgetChromeFields> = {}): WidgetChromeFields {
  return {
    phase: "focus",
    status: "running",
    round: 1,
    roundsPerCycle: 4,
    completedToday: 0,
    dailyGoal: 0,
    language: "en",
    ghost: false,
    quietMinutesLeft: 0,
    soundEnabled: true,
    miniMode: false,
    taskChecklist: false,
    characterId: "duck",
    ...extra,
  };
}

describe("widgetChromeWrites", () => {
  it("writes everything on the first paint", () => {
    const writes = widgetChromeWrites(null, chrome());
    expect(Object.values(writes).every(Boolean)).toBe(true);
  });

  it("skips chrome when only the clock would have moved", () => {
    const writes = widgetChromeWrites(chrome(), chrome());
    expect(writes).toEqual({
      phase: false,
      status: false,
      path: false,
      phaseLabel: false,
      toggle: false,
      tally: false,
      sound: false,
      ghost: false,
      mini: false,
      checklist: false,
      character: false,
    });
  });

  it("rewrites the path when ghost, quiet, phase, or language changes", () => {
    const prev = chrome();
    expect(widgetChromeWrites(prev, chrome({ ghost: true })).path).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ quietMinutesLeft: 30 })).path).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ phase: "shortBreak" })).path).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ language: "es" })).path).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ status: "paused" })).path).toBe(false);
  });

  it("rewrites phase label on round, cycle length, phase, or language", () => {
    const prev = chrome();
    expect(widgetChromeWrites(prev, chrome({ round: 2 })).phaseLabel).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ roundsPerCycle: 6 })).phaseLabel).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ phase: "longBreak" })).phaseLabel).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ language: "es" })).phaseLabel).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ status: "paused" })).phaseLabel).toBe(false);
  });

  it("rewrites toggle on status or language, tally on goal or count", () => {
    const prev = chrome();
    expect(widgetChromeWrites(prev, chrome({ status: "paused" })).toggle).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ language: "es" })).toggle).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ completedToday: 1 })).tally).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ dailyGoal: 8 })).tally).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ ghost: true })).toggle).toBe(false);
    expect(widgetChromeWrites(prev, chrome({ ghost: true })).tally).toBe(false);
  });

  it("isolates sound, ghost, mini, checklist, and character", () => {
    const prev = chrome();
    expect(widgetChromeWrites(prev, chrome({ soundEnabled: false })).sound).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ ghost: true })).ghost).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ miniMode: true })).mini).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ taskChecklist: true })).checklist).toBe(true);
    expect(widgetChromeWrites(prev, chrome({ characterId: "ninja" })).character).toBe(true);

    const idleTick = widgetChromeWrites(prev, chrome());
    expect(idleTick.sound).toBe(false);
    expect(idleTick.ghost).toBe(false);
    expect(idleTick.mini).toBe(false);
    expect(idleTick.checklist).toBe(false);
    expect(idleTick.character).toBe(false);
  });
});

describe("progressWidthChanged", () => {
  it("skips a write when the formatted width is unchanged", () => {
    expect(progressWidthChanged("12.5%", "12.5%")).toBe(false);
    expect(progressWidthChanged("12.5%", "12.6%")).toBe(true);
  });
});
