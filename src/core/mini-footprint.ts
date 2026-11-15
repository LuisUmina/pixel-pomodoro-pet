import type { Phase } from "./types";

/**
 * Mini-mode native window should follow the CSS frame after a tick when a
 * phase just completed (sprite swap) or the clock gained/lost a digit
 * (`99:59` ↔ `100:00`). `completed` is optional — `undefined !== null` is
 * true, so the caller must not use a `!== null` check.
 */
export function miniDispatchNeedsResize(
  completed: Phase | undefined,
  clockLengthBefore: number,
  clockLengthAfter: number,
): boolean {
  return completed !== undefined || clockLengthBefore !== clockLengthAfter;
}

/** Skip a no-op `resizeKeepCenter` when the measured frame barely moved. */
export function shouldSkipMiniResize(
  last: { width: number; height: number } | null,
  next: { width: number; height: number },
  force: boolean,
): boolean {
  if (force || last === null) {
    return false;
  }
  return Math.abs(next.width - last.width) < 0.5 && Math.abs(next.height - last.height) < 0.5;
}
