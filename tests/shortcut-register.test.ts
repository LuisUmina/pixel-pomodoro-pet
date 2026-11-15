import { describe, expect, it } from "vitest";
import { tolerateShortcutRegisterFailure } from "../src/core/shortcut-register";

describe("shortcut register failure policy", () => {
  it("rolls back only when a newly changed key fails during an interactive edit", () => {
    expect(tolerateShortcutRegisterFailure(false, false)).toBe(false);
  });

  it("does not roll back when the failing key is unchanged (e.g. OS still holds Ctrl+Alt+Space)", () => {
    expect(tolerateShortcutRegisterFailure(false, true)).toBe(true);
  });

  it("does not roll back any failure in best-effort mode (boot, import, restore defaults)", () => {
    expect(tolerateShortcutRegisterFailure(true, false)).toBe(true);
    expect(tolerateShortcutRegisterFailure(true, true)).toBe(true);
  });
});
