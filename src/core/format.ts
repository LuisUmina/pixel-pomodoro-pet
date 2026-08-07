import type { Language } from "../i18n/language";
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

const PHASE_LABELS: Readonly<Record<Phase, Readonly<Record<Language, string>>>> = {
  focus: { en: "focus", es: "focus" },
  shortBreak: { en: "break", es: "descanso" },
  longBreak: { en: "long break", es: "descanso largo" },
};

export function phaseLabel(phase: Phase, language: Language): string {
  return PHASE_LABELS[phase][language];
}

const PHASE_HEADLINES: Readonly<Record<Phase, Readonly<Record<Language, string>>>> = {
  focus: { en: "Focus session complete", es: "Sesión de focus completada" },
  shortBreak: { en: "Break over", es: "Descanso terminado" },
  longBreak: { en: "Long break over", es: "Descanso largo terminado" },
};

const PHASE_MESSAGES: Readonly<Record<Phase, Readonly<Record<Language, string>>>> = {
  focus: {
    en: "Step away from the keyboard for a bit.",
    es: "Aléjate del teclado un rato.",
  },
  shortBreak: {
    en: "Back to it — the duck is watching.",
    es: "De vuelta al trabajo — el pato te vigila.",
  },
  longBreak: {
    en: "Recharged. Time for the next cycle.",
    es: "Recargado. Hora del siguiente ciclo.",
  },
};

export function completionNotice(
  phase: Phase,
  language: Language,
): { title: string; body: string } {
  return { title: PHASE_HEADLINES[phase][language], body: PHASE_MESSAGES[phase][language] };
}
