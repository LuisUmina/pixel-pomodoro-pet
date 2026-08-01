import raw from "./catalog.json";
import { MAX_LINE_LENGTH, isTone, isTrigger, type Line } from "./types";

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

export const CATALOG: readonly Line[] = parseCatalog(raw);

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

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isHour(value: unknown): value is number {
  return isCount(value) && value <= 23;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
