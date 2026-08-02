/**
 * A tiny, derived read on how the day has gone. Two things use it: which
 * dialogue lines are eligible (`core/dialogue.ts`), and whether an otherwise
 * idle mascot borrows the sleepy `PetState`'s animations instead of new art
 * getting drawn just for "tired" (`main.ts`).
 *
 * Pure and stateless on purpose, same reasoning as `dialogue.ts` and
 * `reminders.ts`: everything it needs arrives as arguments, so the awkward
 * thresholds are testable without a running app or a real clock.
 */

import type { Mood } from "../messages/types";

export interface MoodInput {
  /** Focus rounds completed today, across cycles. */
  readonly completedToday: number;
  /** Current day streak, from `core/history.ts`. */
  readonly currentStreak: number;
  /** Real time elapsed since the last completed break today. */
  readonly msSinceBreak: number;
}

/** A push this long without a real break reads as tired, whatever else is true. */
export const WEARY_BREAK_GAP_MS = 4 * 60 * 60_000;

/** This many pomodoros in one day is a heavy day on its own. */
export const WEARY_COMPLETED_TODAY = 8;

/** A streak this long, without already being weary, reads as riding momentum. */
export const ENERGIZED_STREAK_DAYS = 3;

export function computeMood(input: MoodInput): Mood {
  if (input.msSinceBreak >= WEARY_BREAK_GAP_MS || input.completedToday >= WEARY_COMPLETED_TODAY) {
    return "weary";
  }

  if (input.currentStreak >= ENERGIZED_STREAK_DAYS) {
    return "energized";
  }

  return "steady";
}
