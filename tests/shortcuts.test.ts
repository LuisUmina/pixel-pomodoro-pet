import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_DEFINITIONS,
  findShortcutConflicts,
  hasPrimaryKey,
  isShortcutAction,
  normalizeShortcut,
  readShortcuts,
} from "../src/core/shortcuts";

describe("shortcuts domain", () => {
  it("identifies valid shortcut actions", () => {
    expect(isShortcutAction("toggle")).toBe(true);
    expect(isShortcutAction("skip")).toBe(true);
    expect(isShortcutAction("reset")).toBe(true);
    expect(isShortcutAction("ghost")).toBe(true);
    expect(isShortcutAction("mini")).toBe(true);
    expect(isShortcutAction("hide")).toBe(true);
    expect(isShortcutAction("unknown")).toBe(false);
    expect(SHORTCUT_DEFINITIONS.length).toBe(6);
  });

  it("normalizes key combinations into standard format", () => {
    expect(normalizeShortcut("ctrl+alt+z")).toBe("Ctrl+Alt+Z");
    expect(normalizeShortcut("Control+Alt+g")).toBe("Ctrl+Alt+G");
    expect(normalizeShortcut("ctrl+alt+space")).toBe("Ctrl+Alt+Space");
    expect(normalizeShortcut("alt+ctrl+h")).toBe("Ctrl+Alt+H");
    expect(normalizeShortcut("shift+ctrl+alt+n")).toBe("Ctrl+Alt+Shift+N");
  });

  it("checks whether a shortcut string has a primary non-modifier key", () => {
    expect(hasPrimaryKey("Ctrl+Alt+G")).toBe(true);
    expect(hasPrimaryKey("Space")).toBe(true);
    expect(hasPrimaryKey("Ctrl+Alt")).toBe(false);
    expect(hasPrimaryKey("Ctrl")).toBe(false);
    expect(hasPrimaryKey("")).toBe(false);
  });

  it("detects shortcut conflicts between actions", () => {
    const map = {
      ...DEFAULT_SHORTCUTS,
      skip: "Ctrl+Alt+G", // Conflicts with ghost
    };

    const conflicts = findShortcutConflicts(map);
    expect(conflicts.skip).toBe("ghost");
    expect(conflicts.ghost).toBe("skip");
    expect(conflicts.toggle).toBe(null);
  });

  it("reads shortcuts defensively from stored preferences", () => {
    // Non-object falls back to defaults
    expect(readShortcuts(null)).toEqual(DEFAULT_SHORTCUTS);
    expect(readShortcuts("invalid")).toEqual(DEFAULT_SHORTCUTS);

    // Partial object fills missing with defaults
    const custom = readShortcuts({
      toggle: "Ctrl+Alt+P",
    });
    expect(custom.toggle).toBe("Ctrl+Alt+P");
    expect(custom.skip).toBe("Ctrl+Alt+N");

    // Conflicting custom object falls back conflicting keys to default
    const conflicting = readShortcuts({
      toggle: "Ctrl+Alt+G",
      ghost: "Ctrl+Alt+G",
    });
    expect(conflicting.toggle).toBe("Ctrl+Alt+Space");
    expect(conflicting.ghost).toBe("Ctrl+Alt+G");
  });
});
