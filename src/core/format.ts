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
