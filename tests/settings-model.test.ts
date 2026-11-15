import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "../src/core/pomodoro";
import type { CustomReminder } from "../src/core/reminders";
import { DEFAULT_SHORTCUTS } from "../src/core/shortcuts";
import { DEFAULT_DAILY_GOAL } from "../src/dailyGoal";
import { DEFAULT_DIM_OPACITY } from "../src/dim";
import { DEFAULT_CHARACTER_ID } from "../src/sprites/characters";
import { getTheme } from "../src/sprites/themes";
import type { SettingsModel } from "../src/ui/settings-panel";
import {
  customRemindersSignature,
  sameCustomReminders,
  sameSettingsModel,
  shouldSkipCustomReminderRender,
} from "../src/ui/settings-panel";

function reminder(overrides: Partial<CustomReminder> = {}): CustomReminder {
  return {
    id: "r1",
    text: "stretch",
    everyMinutes: 20,
    anchor: "focus",
    ...overrides,
  };
}

function model(overrides: Partial<SettingsModel> = {}): SettingsModel {
  return {
    settings: DEFAULT_SETTINGS,
    uiScale: 1,
    voice: "dev",
    language: "en",
    reminders: { water: true, eyes: true },
    customReminders: [],
    shortcuts: DEFAULT_SHORTCUTS,
    quietMinutesLeft: 0,
    characterId: DEFAULT_CHARACTER_ID,
    miniMode: false,
    dimOpacity: DEFAULT_DIM_OPACITY,
    dailyGoal: DEFAULT_DAILY_GOAL,
    theme: getTheme("tokyo-night"),
    ...overrides,
  };
}

describe("sameSettingsModel", () => {
  it("treats distinct objects with the same settings fields as equal", () => {
    const a = model();
    const b = model({
      settings: { ...DEFAULT_SETTINGS },
      reminders: { ...a.reminders },
      shortcuts: { ...DEFAULT_SHORTCUTS },
      theme: getTheme("tokyo-night"),
    });

    expect(a).not.toBe(b);
    expect(sameSettingsModel(a, b)).toBe(true);
  });

  it("ignores theme object identity and compares theme.id", () => {
    expect(sameSettingsModel(model(), model({ theme: getTheme("tokyo-night") }))).toBe(true);
    expect(sameSettingsModel(model(), model({ theme: getTheme("dracula") }))).toBe(false);
  });

  it.each([
    ["focusMinutes", { settings: { ...DEFAULT_SETTINGS, focusMinutes: 50 } }],
    ["uiScale", { uiScale: 1.25 }],
    ["voice", { voice: "off" as const }],
    ["language", { language: "es" as const }],
    ["reminders", { reminders: { water: true, eyes: false } }],
    ["customReminders", { customReminders: [reminder()] }],
    ["shortcuts", { shortcuts: { ...DEFAULT_SHORTCUTS, hide: "Ctrl+Alt+X" } }],
    ["quietMinutesLeft", { quietMinutesLeft: 30 }],
    ["characterId", { characterId: "ninja" }],
    ["miniMode", { miniMode: true }],
    ["dimOpacity", { dimOpacity: 0.65 }],
    ["dailyGoal", { dailyGoal: 6 }],
  ] as const)("returns false when %s changes", (_field, override) => {
    expect(sameSettingsModel(model(), model(override))).toBe(false);
  });
});

describe("sameCustomReminders", () => {
  it("returns true for copies with the same fields in the same order", () => {
    const a = [reminder(), reminder({ id: "r2", text: "water", anchor: "break" })];
    const b = a.map((item) => ({ ...item }));
    expect(a).not.toBe(b);
    expect(sameCustomReminders(a, b)).toBe(true);
  });

  it("returns false when id, text, cadence, anchor, length, or order differ", () => {
    const base = [reminder()];
    expect(sameCustomReminders(base, [reminder({ id: "other" })])).toBe(false);
    expect(sameCustomReminders(base, [reminder({ text: "water" })])).toBe(false);
    expect(sameCustomReminders(base, [reminder({ everyMinutes: 5 })])).toBe(false);
    expect(sameCustomReminders(base, [reminder({ anchor: "break" })])).toBe(false);
    expect(sameCustomReminders(base, [reminder(), reminder({ id: "r2" })])).toBe(false);
    expect(
      sameCustomReminders(
        [reminder({ id: "a" }), reminder({ id: "b" })],
        [reminder({ id: "b" }), reminder({ id: "a" })],
      ),
    ).toBe(false);
  });
});

describe("custom reminder signature guard", () => {
  it("is stable for equal reminder lists even when the array is a copy", () => {
    const a = [reminder(), reminder({ id: "r2", text: "water" })];
    const b = a.map((item) => ({ ...item }));
    expect(customRemindersSignature(a)).toBe(customRemindersSignature(b));
    expect(customRemindersSignature(a)).not.toBe(customRemindersSignature([reminder()]));
  });

  it("skips rebuilds only when the serialized list and disabled flag match", () => {
    const serialized = customRemindersSignature([reminder()]);
    expect(
      shouldSkipCustomReminderRender(serialized, false, serialized, false, false),
    ).toBe(true);
    expect(
      shouldSkipCustomReminderRender(serialized, true, serialized, false, false),
    ).toBe(false);
    expect(
      shouldSkipCustomReminderRender(
        customRemindersSignature([reminder({ text: "other" })]),
        false,
        serialized,
        false,
        false,
      ),
    ).toBe(false);
    expect(
      shouldSkipCustomReminderRender(serialized, false, serialized, false, true),
    ).toBe(false);
    expect(shouldSkipCustomReminderRender(serialized, false, "", null, false)).toBe(false);
  });
});
