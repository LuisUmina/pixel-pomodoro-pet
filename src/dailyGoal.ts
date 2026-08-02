/**
 * How many pomodoros make a good day, mirroring `dim.ts`: a small numeric
 * preference with clean presets, one of which doubles as the shipped
 * default (off).
 */

export const MIN_DAILY_GOAL = 0;
export const MAX_DAILY_GOAL = 20;
export const DEFAULT_DAILY_GOAL = 0;

/** Offered in settings; 0 turns the goal off, so the tally just counts up. */
export const DAILY_GOAL_PRESETS = [0, 4, 6, 8] as const;

export function clampDailyGoal(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DAILY_GOAL;
  }

  return Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, Math.round(value)));
}

export function formatDailyGoal(value: number): string {
  return value <= 0 ? "OFF" : String(value);
}
