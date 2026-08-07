import raw from "./catalog.json";
import esText from "./catalog.es.json";
import { MAX_LINE_LENGTH, isMood, isTone, isTrigger, type Line, type Mood } from "./types";
import type { Language } from "../i18n/language";

/**
 * Parses the bundled catalogue, refusing anything malformed.
 *
 * This is our own data rather than the user's, so it fails loudly instead of
 * falling back the way `store/preferences.ts` does: a broken line should stop
 * a test, not reach a release and go quietly missing on screen.
 */
export function parseCatalog(value: unknown): readonly Line[] {
  if (!Array.isArray(value)) {
    throw new Error("the message catalogue must be an array");
  }

  const seen = new Set<string>();

  return value.map((entry, index) => {
    const line = parseLine(entry, index);
    if (seen.has(line.id)) {
      throw new Error(`duplicate message id "${line.id}"`);
    }

    seen.add(line.id);
    return line;
  });
}

/** The English catalogue. Also the structural source of truth: ids,
 * triggers, tones and every condition live only here — a translation only
 * ever supplies the words. */
export const CATALOG_EN: readonly Line[] = parseCatalog(raw);

/** Kept for existing call sites that only ever knew one language. */
export const CATALOG: readonly Line[] = CATALOG_EN;

/**
 * The Spanish catalogue, built by swapping the text on every English line.
 * Same ids, same triggers, same conditions — so the two languages can never
 * drift apart on *which* line fires when, only on what it says.
 */
export const CATALOG_ES: readonly Line[] = translate(CATALOG_EN, esText);

export function catalogFor(language: Language): readonly Line[] {
  return language === "es" ? CATALOG_ES : CATALOG_EN;
}

function translate(lines: readonly Line[], translations: Readonly<Record<string, string>>): readonly Line[] {
  return lines.map((line) => {
    const text = translations[line.id];
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error(`message "${line.id}" has no Spanish translation`);
    }

    if (text.length > MAX_LINE_LENGTH) {
      throw new Error(`Spanish text for "${line.id}" is longer than ${MAX_LINE_LENGTH} characters`);
    }

    return { ...line, text };
  });
}

function parseLine(value: unknown, index: number): Line {
  if (!isRecord(value)) {
    throw new Error(`message ${index} is not an object`);
  }

  const id = value["id"];
  if (typeof id !== "string" || id === "") {
    throw new Error(`message ${index} has no id`);
  }

  const trigger = value["trigger"];
  if (!isTrigger(trigger)) {
    throw new Error(`message "${id}" has an unknown trigger`);
  }

  const tone = value["tone"];
  if (!isTone(tone)) {
    throw new Error(`message "${id}" has an unknown tone`);
  }

  const text = value["text"];
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error(`message "${id}" has no text`);
  }

  if (text.length > MAX_LINE_LENGTH) {
    throw new Error(`message "${id}" is longer than ${MAX_LINE_LENGTH} characters`);
  }

  return {
    id,
    trigger,
    tone,
    text,
    ...tally(value, id),
    ...hourWindow(value, id),
    ...mood(value, id),
  };
}

function tally(
  value: Record<string, unknown>,
  id: string,
): { minCompleted?: number; maxCompleted?: number } {
  const min = value["minCompleted"];
  const max = value["maxCompleted"];

  if (min !== undefined && !isCount(min)) {
    throw new Error(`message "${id}" has a malformed minCompleted`);
  }

  if (max !== undefined && !isCount(max)) {
    throw new Error(`message "${id}" has a malformed maxCompleted`);
  }

  if (isCount(min) && isCount(max) && min > max) {
    throw new Error(`message "${id}" can never be reached: minCompleted > maxCompleted`);
  }

  return {
    ...(isCount(min) ? { minCompleted: min } : {}),
    ...(isCount(max) ? { maxCompleted: max } : {}),
  };
}

function hourWindow(
  value: Record<string, unknown>,
  id: string,
): { hours?: readonly [number, number] } {
  const hours = value["hours"];
  if (hours === undefined) {
    return {};
  }

  if (!Array.isArray(hours) || hours.length !== 2) {
    throw new Error(`message "${id}" needs exactly two hours`);
  }

  const [from, to] = hours;
  if (!isHour(from) || !isHour(to)) {
    throw new Error(`message "${id}" has an hour outside 0-23`);
  }

  if (from === to) {
    throw new Error(`message "${id}" has an empty hour window`);
  }

  return { hours: [from, to] };
}

function mood(value: Record<string, unknown>, id: string): { mood?: Mood } {
  const raw = value["mood"];
  if (raw === undefined) {
    return {};
  }

  if (!isMood(raw)) {
    throw new Error(`message "${id}" has an unknown mood`);
  }

  return { mood: raw };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isHour(value: unknown): value is number {
  return isCount(value) && value <= 23;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
