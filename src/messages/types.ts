/** Shapes for the dialogue catalogue. Data only — no selection logic here. */

/** The moments the widget can ask the mascot to say something. */
export const TRIGGERS = [
  "focusStart",
  "focusDone",
  "breakStart",
  "breakDone",
  "paused",
  "idle",
  "welcomeBack",
] as const;

export type Trigger = (typeof TRIGGERS)[number];

/**
 * Triggers that fire on their own rather than off a user action. They are the
 * ones capable of becoming noise, so only these wait for the cooldown.
 */
export const AMBIENT_TRIGGERS: ReadonlySet<Trigger> = new Set<Trigger>([
  "idle",
  "welcomeBack",
]);

/** Personalities the catalogue is written in. */
export const TONES = ["dev", "hype", "plain"] as const;

export type Tone = (typeof TONES)[number];

/**
 * What the user actually picks. `off` has no lines by design: a mascot that
 * talks is charming on day one and a reason to uninstall on day three, so
 * silence has to be a first-class choice rather than a tone nobody wrote.
 */
export const VOICES = [...TONES, "off"] as const;

export type Voice = (typeof VOICES)[number];

/**
 * Longest line the bubble can show without overflowing its fixed box. The
 * catalogue is validated against this, so a too-long line fails a test rather
 * than clipping on screen.
 */
export const MAX_LINE_LENGTH = 68;

export interface Line {
  readonly id: string;
  readonly trigger: Trigger;
  readonly tone: Tone;
  readonly text: string;
  /** Only offered once the day's tally has reached this. */
  readonly minCompleted?: number;
  /** Only offered while the day's tally is still at or below this. */
  readonly maxCompleted?: number;
  /** Local-hour window `[from, to)`. Wraps when `from` is the larger one. */
  readonly hours?: readonly [number, number];
}

export function isTrigger(value: unknown): value is Trigger {
  return TRIGGERS.includes(value as Trigger);
}

export function isTone(value: unknown): value is Tone {
  return TONES.includes(value as Tone);
}

export function isVoice(value: unknown): value is Voice {
  return VOICES.includes(value as Voice);
}
