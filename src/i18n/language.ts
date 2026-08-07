/** The two languages the whole app -- chrome, dialogue, reminders -- can speak. */
export const LANGUAGES = ["en", "es"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/** A value with one variant per language. Content files are built from this. */
export type Localized<T> = Readonly<Record<Language, T>>;

export function localize<T>(value: Localized<T>, language: Language): T {
  return value[language];
}
