import { INITIAL_HISTORY, type HistoryState } from "../core/history";
import type { JsonStore } from "./persistence";

const STORAGE_KEY = "pixel-pomodoro-pet:history";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

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
    bestDay: typeof raw["bestDay"] === "string" && ISO_DAY.test(raw["bestDay"]) ? raw["bestDay"] : "",
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
    if (ISO_DAY.test(day) && typeof count === "number" && Number.isFinite(count) && count > 0) {
      days[day] = Math.floor(count);
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
