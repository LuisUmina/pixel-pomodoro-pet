/**
 * Tracks completed focus sessions by day: streaks, records, and the heatmap.
 * Pure, like the rest of `core/` — a day string and a die (where one is
 * needed) arrive as arguments, so the streak rule is provable without wiring
 * up a clock.
 *
 * A streak that breaks the moment you rest a single day teaches the opposite
 * of what a pomodoro app is for. So a streak survives one gap day per
 * Monday-anchored week — a standing day off, not a budget you manage — and
 * only breaks on a second gap in the same week. That is the one rule this
 * module enforces; everything else here is arithmetic over `days`.
 */

import { isoDay } from "./format";

/** Roughly 53 weeks — enough for a full-year heatmap, small enough to keep. */
export const RETENTION_DAYS = 371;

/** Gap days a week may absorb before a streak actually breaks. */
export const REST_DAYS_PER_WEEK = 1;

export interface HistoryState {
  /** ISO day to sessions completed that day. A day never in here means 0. */
  readonly days: Readonly<Record<string, number>>;
  /** All-time count, never pruned — the one figure that outlives `days`. */
  readonly totalSessions: number;
  readonly bestDayCount: number;
  /** ISO day the record in `bestDayCount` was set on; "" before any session. */
  readonly bestDay: string;
  /** Best 7-day rolling total ever seen. */
  readonly bestWeekCount: number;
  readonly bestStreak: number;
}

export const INITIAL_HISTORY: HistoryState = {
  days: {},
  totalSessions: 0,
  bestDayCount: 0,
  bestDay: "",
  bestWeekCount: 0,
  bestStreak: 0,
};

export interface HeatmapCell {
  readonly day: string;
  readonly count: number;
}

/** Records one completed focus session against `day`. */
export function recordSession(state: HistoryState, day: string): HistoryState {
  const days = prune({ ...state.days, [day]: (state.days[day] ?? 0) + 1 }, day);
  const dayCount = days[day] ?? 0;
  const weekCount = rollingWeekSum(days, day);
  const streak = currentStreak(days, day);

  return {
    days,
    totalSessions: state.totalSessions + 1,
    bestDayCount: Math.max(state.bestDayCount, dayCount),
    // `>` rather than `>=`: matching the record again keeps the day it was
    // first set on, instead of the credit silently hopping to today.
    bestDay: dayCount > state.bestDayCount ? day : state.bestDay,
    bestWeekCount: Math.max(state.bestWeekCount, weekCount),
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

/**
 * The streak as of `today`, walking backward.
 *
 * `today` gets special treatment: a day with nothing logged yet is not a
 * broken streak, just a day still in progress. Every day before that follows
 * the gap rule — one forgiven per Monday-anchored week — so the number stays
 * honest whether this runs right after a session or just to paint a screen.
 */
export function currentStreak(
  days: Readonly<Record<string, number>>,
  today: string,
  restDaysPerWeek: number = REST_DAYS_PER_WEEK,
): number {
  let streak = 0;
  let graceUsed = 0;
  let weekKey = mondayWeekIndex(today);
  let cursor = today;

  for (let i = 0; i < RETENTION_DAYS; i += 1) {
    const week = mondayWeekIndex(cursor);
    if (week !== weekKey) {
      weekKey = week;
      graceUsed = 0;
    }

    const count = days[cursor] ?? 0;

    if (count > 0) {
      streak += 1;
    } else if (i === 0) {
      // Today, untouched so far — check yesterday instead of breaking here.
    } else if (graceUsed < restDaysPerWeek) {
      graceUsed += 1;
    } else {
      break;
    }

    cursor = shiftIsoDay(cursor, -1);
  }

  return streak;
}

/** The last `RETENTION_DAYS` days ending today, oldest first, for a heatmap. */
export function heatmap(
  days: Readonly<Record<string, number>>,
  today: string,
  span: number = RETENTION_DAYS,
): readonly HeatmapCell[] {
  const cells: HeatmapCell[] = [];

  for (let i = span - 1; i >= 0; i -= 1) {
    const day = shiftIsoDay(today, -i);
    cells.push({ day, count: days[day] ?? 0 });
  }

  return cells;
}

/** Buckets a day's count into five shades, GitHub-heatmap style. */
export function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) {
    return 0;
  }
  if (count === 1) {
    return 1;
  }
  if (count === 2) {
    return 2;
  }
  return count <= 4 ? 3 : 4;
}

function rollingWeekSum(days: Readonly<Record<string, number>>, endDay: string): number {
  let sum = 0;
  let cursor = endDay;

  for (let i = 0; i < 7; i += 1) {
    sum += days[cursor] ?? 0;
    cursor = shiftIsoDay(cursor, -1);
  }

  return sum;
}

/** Drops anything older than the retention window, keyed off `today`. */
function prune(
  days: Readonly<Record<string, number>>,
  today: string,
): Record<string, number> {
  const cutoff = shiftIsoDay(today, -(RETENTION_DAYS - 1));
  const pruned: Record<string, number> = {};

  // ISO day strings sort exactly like the dates they name, so this is a
  // plain string comparison — no parsing, no timezone to get wrong.
  for (const [day, count] of Object.entries(days)) {
    if (day >= cutoff && day <= today) {
      pruned[day] = count;
    }
  }

  return pruned;
}

/** An ISO day `deltaDays` away from `day`, in local calendar time. */
export function shiftIsoDay(day: string, deltaDays: number): string {
  const date = parseIsoDay(day);
  date.setDate(date.getDate() + deltaDays);
  return isoDay(date);
}

function parseIsoDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1);
}

/**
 * A count of Monday-anchored weeks since a fixed reference Monday. Not a
 * calendar week number: those roll over at year boundaries in ways that would
 * otherwise have to be special-cased for no benefit here.
 *
 * Built on UTC-midnight instants rather than local ones purely so a day near
 * a daylight-saving change cannot shift the count: `Date.UTC` never applies a
 * local DST rule, so a whole calendar day is always exactly 86 400 000 ms
 * here regardless of what the local clock did that day. `isoDay` and
 * `shiftIsoDay` still work in local time for identifying "today" itself —
 * this helper only ever compares two already-known calendar dates.
 */
function mondayWeekIndex(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  const utcMidnight = Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1);
  const referenceMonday = Date.UTC(2020, 0, 6); // a Monday

  return Math.floor((utcMidnight - referenceMonday) / (7 * 86_400_000));
}
