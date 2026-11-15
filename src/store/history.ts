import { isoDay } from "../core/format";
import { INITIAL_HISTORY, type HistoryState } from "../core/history";
import type { JsonStore } from "./persistence";

const STORAGE_KEY = "pixel-pomodoro-pet:history";

const ISO_DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shape alone lets an impossible date like `2026-02-31` through: `Date`
 * silently rolls it over to March rather than rejecting it. Re-formatting
 * the parsed date and comparing it back to the input catches that — a
 * calendar date that does not round-trip was never a real one.
 */
function isValidIsoDay(value: string): boolean {
  if (!ISO_DAY_SHAPE.test(value)) {
    return false;
  }

  const [year, month, date] = value.split("-").map(Number);
  return isoDay(new Date(year ?? 0, (month ?? 1) - 1, date ?? 1)) === value;
}

/**
 * Reads history defensively, the same way `store/preferences.ts` does:
 * anything missing, malformed, or out of range falls back rather than
 * propagating into the streak math.
 */
export function loadHistory(store: JsonStore): HistoryState {
  const raw = store.get(STORAGE_KEY);
  if (!isRecord(raw)) {
    return INITIAL_HISTORY;
  }

  return historyFromRecord(raw);
}

/**
 * Whether a backup value may replace stored history.
 *
 * `loadHistory` fills every gap with a zero. That is the right read for a
 * missing store key and the wrong write for import: `{}` would become
 * {@link INITIAL_HISTORY} and erase a real log. A payload is importable when
 * the same day checks keep at least one session, or when it is a complete
 * history record — including an explicit all-zero log, which is what export
 * writes for a profile that has no sessions yet.
 */
export function isImportableHistory(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false;
  }

  if (Object.keys(readDays(raw["days"])).length > 0) {
    return true;
  }

  return isCompleteHistoryRecord(raw);
}

function historyFromRecord(raw: Record<string, unknown>): HistoryState {
  return {
    days: readDays(raw["days"]),
    totalSessions: readCount(raw["totalSessions"]),
    bestDayCount: readCount(raw["bestDayCount"]),
    bestDay: typeof raw["bestDay"] === "string" && isValidIsoDay(raw["bestDay"]) ? raw["bestDay"] : "",
    bestWeekCount: readCount(raw["bestWeekCount"]),
    bestStreak: readCount(raw["bestStreak"]),
  };
}

function isCompleteHistoryRecord(raw: Record<string, unknown>): boolean {
  return (
    isRecord(raw["days"]) &&
    isStoredCount(raw["totalSessions"]) &&
    isStoredCount(raw["bestDayCount"]) &&
    isStoredCount(raw["bestWeekCount"]) &&
    isStoredCount(raw["bestStreak"]) &&
    isStoredBestDay(raw["bestDay"])
  );
}

function isStoredCount(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isStoredBestDay(value: unknown): boolean {
  return typeof value === "string" && (value === "" || isValidIsoDay(value));
}

export function saveHistory(store: JsonStore, state: HistoryState): void {
  store.set(STORAGE_KEY, state);
}

function readDays(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const days: Record<string, number> = {};

  for (const [day, count] of Object.entries(value)) {
    if (!isValidIsoDay(day) || typeof count !== "number" || !Number.isFinite(count)) {
      continue;
    }

    // Floored first: a stored `0.5` would pass a `count > 0` check but floor
    // to a `0` entry, contradicting `days`' own invariant that a day present
    // in the map represents at least one real session.
    const floored = Math.floor(count);
    if (floored >= 1) {
      days[day] = floored;
    }
  }

  return days;
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
