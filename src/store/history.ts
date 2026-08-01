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

  return {
    days: readDays(raw["days"]),
    totalSessions: readCount(raw["totalSessions"]),
    bestDayCount: readCount(raw["bestDayCount"]),
    bestDay: typeof raw["bestDay"] === "string" && isValidIsoDay(raw["bestDay"]) ? raw["bestDay"] : "",
    bestWeekCount: readCount(raw["bestWeekCount"]),
    bestStreak: readCount(raw["bestStreak"]),
  };
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
