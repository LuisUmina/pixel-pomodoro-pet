import data from "./themes.json";
import type { SpritePalette } from "./types";

export type ThemeId = keyof typeof data;

export interface Theme {
  readonly id: ThemeId;
  readonly name: string;
  /** CSS custom properties written onto the document root. */
  readonly css: Readonly<Record<string, string>>;
  /** Colours for the mascot, so a theme repaints the duck too. */
  readonly sprite: SpritePalette;
}

export const THEME_IDS = Object.keys(data) as readonly ThemeId[];

export const DEFAULT_THEME_ID: ThemeId = "tokyo-night";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && Object.hasOwn(data, value);
}

export function getTheme(id: ThemeId): Theme {
  return { id, ...data[id] };
}

/** The theme after `id`, wrapping around — used by the cycle button. */
export function nextThemeId(id: ThemeId): ThemeId {
  const index = THEME_IDS.indexOf(id);
  return THEME_IDS[(index + 1) % THEME_IDS.length] ?? DEFAULT_THEME_ID;
}

export function applyThemeCss(theme: Theme, root: HTMLElement): void {
  for (const [property, value] of Object.entries(theme.css)) {
    root.style.setProperty(property, value);
  }
}
