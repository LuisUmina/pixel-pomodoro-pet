import { DEFAULT_SHORTCUTS, type ShortcutAction, type ShortcutMap } from "../core/shortcuts";
import type { Language } from "./language";
import { t, type UiStringKey } from "./strings";

/** Titlebar/control strings that embed a default hotkey we swap for the live map. */
export const SHORTCUT_CHROME_KEYS = {
  ghost: "titlebar.ghost",
  mini: "titlebar.mini",
  hide: "titlebar.hide",
  skip: "controls.skipHint",
  reset: "controls.resetHint",
} as const satisfies Record<
  Extract<ShortcutAction, "ghost" | "mini" | "hide" | "skip" | "reset">,
  UiStringKey
>;

export type ShortcutChromeAction = keyof typeof SHORTCUT_CHROME_KEYS;

export const PET_HINT_KEYS: Readonly<Record<string, UiStringKey>> = {
  duck: "pet.duck.hint",
  tentacat: "pet.tentacat.hint",
  bug: "pet.bug.hint",
  coffee: "pet.coffee.hint",
  ninja: "pet.ninja.hint",
  pill: "pet.pill.hint",
  terminal: "pet.terminal.hint",
  spark: "pet.spark.hint",
};

export function shortcutChromeTitle(
  action: ShortcutChromeAction,
  language: Language,
  shortcuts: ShortcutMap,
): string {
  return t(SHORTCUT_CHROME_KEYS[action], language).replace(
    DEFAULT_SHORTCUTS[action],
    shortcuts[action],
  );
}

export function petHintTitle(id: string, language: Language, fallback: string): string {
  const key = PET_HINT_KEYS[id];
  return key ? t(key, language) : fallback;
}

/** Localized copy for a failed native `updateShortcuts` invoke — never the Rust string. */
export function shortcutUpdateFailedMessage(language: Language): string {
  return t("shortcuts.updateFailed", language);
}
