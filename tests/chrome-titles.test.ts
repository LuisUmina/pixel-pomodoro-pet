import { describe, expect, it } from "vitest";

import { DEFAULT_SHORTCUTS } from "../src/core/shortcuts";
import {
  PET_HINT_KEYS,
  SHORTCUT_CHROME_KEYS,
  petHintTitle,
  shortcutChromeTitle,
  shortcutUpdateFailedMessage,
} from "../src/i18n/chrome-titles";
import { LANGUAGES } from "../src/i18n/language";
import { t } from "../src/i18n/strings";
import { CHARACTERS } from "../src/sprites/characters";

describe("shortcut chrome titles", () => {
  it("keeps the default hotkey token in every language so replace can swap it", () => {
    for (const language of LANGUAGES) {
      for (const [action, key] of Object.entries(SHORTCUT_CHROME_KEYS)) {
        expect(t(key, language)).toContain(DEFAULT_SHORTCUTS[action as keyof typeof SHORTCUT_CHROME_KEYS]);
      }
    }
  });

  it("interpolates a customized hide shortcut in English and Spanish", () => {
    const shortcuts = { ...DEFAULT_SHORTCUTS, hide: "Ctrl+Alt+X" };
    expect(shortcutChromeTitle("hide", "en", shortcuts)).toContain("Ctrl+Alt+X");
    expect(shortcutChromeTitle("hide", "en", shortcuts)).not.toContain("Ctrl+Alt+H");
    expect(shortcutChromeTitle("hide", "es", shortcuts)).toContain("Ctrl+Alt+X");
    expect(shortcutChromeTitle("hide", "es", shortcuts)).not.toContain("Ctrl+Alt+H");
  });

  it("leaves the template alone when the binding is still the shipped default", () => {
    expect(shortcutChromeTitle("ghost", "en", DEFAULT_SHORTCUTS)).toBe(t("titlebar.ghost", "en"));
  });
});

describe("pet hint titles", () => {
  it("covers every shipped character so a new pet cannot ship English-only", () => {
    for (const character of CHARACTERS) {
      expect(PET_HINT_KEYS[character.id], character.id).toBeDefined();
    }
  });

  it("returns a Spanish hint that is not the English copy", () => {
    expect(petHintTitle("duck", "en", "fallback")).toBe("The classic debugging companion");
    expect(petHintTitle("duck", "es", "fallback")).toBe("El clásico compañero de depuración");
  });

  it("falls back when the id is unknown", () => {
    expect(petHintTitle("not-a-pet", "es", "JSON hint")).toBe("JSON hint");
  });
});

describe("shortcut update failure copy", () => {
  it("uses the localized chrome string, not a raw Rust error", () => {
    expect(shortcutUpdateFailedMessage("en")).toBe("Couldn't update the shortcut.");
    expect(shortcutUpdateFailedMessage("es")).toBe("No se pudo actualizar el atajo.");
    expect(shortcutUpdateFailedMessage("es")).not.toMatch(/Se restauraron los atajos/);
  });
});

describe("bubble.dismiss", () => {
  it("is bilingual so data-i18n-title can leave English on a Spanish UI", () => {
    expect(t("bubble.dismiss", "en")).toBe("Click to dismiss");
    expect(t("bubble.dismiss", "es")).toBe("Clic para cerrar");
  });
});
