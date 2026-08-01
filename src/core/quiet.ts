/**
 * A temporary vow of silence, for calls and screen shares.
 *
 * Stored as the instant it expires rather than a countdown, so it survives a
 * restart and cannot get stuck on: the worst a stale value can do is run out.
 */

/** Offered in settings; 0 means "speak normally". */
export const QUIET_PRESETS = [0, 30, 60, 120] as const;

/** Anything further out than this came from a bad clock, not from the user. */
export const MAX_QUIET_MS = 12 * 60 * 60_000;

export function isQuiet(quietUntil: number, now: number): boolean {
  return quietUntil > now && quietUntil - now <= MAX_QUIET_MS;
}

export function quietUntilFrom(minutes: number, now: number): number {
  return minutes <= 0 ? 0 : now + minutes * 60_000;
}

/** Whole minutes left, rounded up so it never reads "0m" while still on. */
export function quietMinutesLeft(quietUntil: number, now: number): number {
  if (!isQuiet(quietUntil, now)) {
    return 0;
  }

  return Math.ceil((quietUntil - now) / 60_000);
}

/** `90m` under an hour and a half, `2h` beyond — kept short for the title bar. */
export function formatQuiet(minutes: number): string {
  return minutes > 90 ? `${Math.round(minutes / 60)}h` : `${minutes}m`;
}
