import { describe, expect, it } from "vitest";

import { storedShortcutsAfterRestore } from "../src/core/shortcut-register";
import { DEFAULT_SHORTCUTS } from "../src/core/shortcuts";
import { defaultPreferences, restorePanelDefaults } from "../src/store/preferences";

const DAY = "2026-11-15";

function customized() {
  return {
    ...defaultPreferences(DAY),
    characterId: "ninja",
    voice: "hype" as const,
    shortcuts: { ...DEFAULT_SHORTCUTS, hide: "Ctrl+Alt+X" },
    miniMode: true,
    taskChecklist: true,
    uiScale: 1.5,
    themeId: "dracula" as const,
    soundEnabled: false,
    language: "es" as const,
    completedToday: 3,
    settings: {
      ...defaultPreferences(DAY).settings,
      focusMinutes: 50,
    },
  };
}

describe("restorePanelDefaults", () => {
  it("clears the mini-mode checklist flag that Restore Defaults used to leave on", () => {
    const current = customized();
    const shipped = defaultPreferences(DAY);
    const restored = restorePanelDefaults(current, shipped);

    expect(current.taskChecklist).toBe(true);
    expect(shipped.taskChecklist).toBe(false);
    expect(restored.taskChecklist).toBe(false);
  });

  it("resets panel-owned fields and leaves theme, language, sound, and the day's tally", () => {
    const current = customized();
    const shipped = defaultPreferences(DAY);
    const restored = restorePanelDefaults(current, shipped);

    expect(restored.settings).toEqual(shipped.settings);
    expect(restored.voice).toBe(shipped.voice);
    expect(restored.characterId).toBe(shipped.characterId);
    expect(restored.shortcuts).toEqual(shipped.shortcuts);
    expect(restored.quietUntil).toBe(shipped.quietUntil);

    expect(restored.themeId).toBe("dracula");
    expect(restored.language).toBe("es");
    expect(restored.soundEnabled).toBe(false);
    expect(restored.completedToday).toBe(3);
    expect(restored.day).toBe(DAY);
  });
});

describe("storedShortcutsAfterRestore", () => {
  const previous = { ...DEFAULT_SHORTCUTS, hide: "Ctrl+Alt+X" };
  const shipped = DEFAULT_SHORTCUTS;

  it("keeps the shipped map when native restore succeeds (including best-effort)", () => {
    expect(storedShortcutsAfterRestore(previous, shipped, true)).toBe(shipped);
  });

  it("reverts to the previous map when the native invoke fails and the OS rolled back", () => {
    expect(storedShortcutsAfterRestore(previous, shipped, false)).toBe(previous);
  });
});
