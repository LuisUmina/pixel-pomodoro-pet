import type { Phase } from "./types";

/** `mm:ss`, rounding up so the clock shows 25:00 the instant it starts. */
export function formatClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${pad(minutes)}:${pad(seconds)}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Local calendar day as `YYYY-MM-DD`. Used as the key for anything that
 * resets or accumulates by day — today's tally, reminder packs, history.
 * Local time on purpose: a day should turn when the user's day does, not
 * when UTC's does.
 *
 * The year is padded to 4 digits too, not just month and day: `getFullYear`
 * returns `500` as `"500"`, and `store/history.ts` validates a stored day by
 * round-tripping it back through this function, so an unpadded year would
 * never match its own 4-digit input and would reject an otherwise valid day.
 */
export function isoDay(date: Date): string {
  return `${padYear(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function padYear(value: number): string {
  return value.toString().padStart(4, "0");
}

const PHASE_LABELS: Readonly<Record<Phase, string>> = {
  focus: "focus",
  shortBreak: "break",
  longBreak: "long break",
};

export function phaseLabel(phase: Phase): string {
  return PHASE_LABELS[phase];
}

const PHASE_HEADLINES: Readonly<Record<Phase, string>> = {
  focus: "Focus session complete",
  shortBreak: "Break over",
  longBreak: "Long break over",
};

const PHASE_MESSAGES: Readonly<Record<Phase, string>> = {
  focus: "Step away from the keyboard for a bit.",
  shortBreak: "Back to it — the duck is watching.",
  longBreak: "Recharged. Time for the next cycle.",
};

export function completionNotice(phase: Phase): { title: string; body: string } {
  return { title: PHASE_HEADLINES[phase], body: PHASE_MESSAGES[phase] };
}
