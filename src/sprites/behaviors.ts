/**
 * What the mascot does with itself between events.
 *
 * A single looping animation per mood reads as a machine within about a
 * minute of watching it. Instead each mood offers several short behaviours,
 * weighted, and one is drawn at the end of every performance — so the duck
 * mostly breathes, occasionally glances about, and now and then wanders a
 * couple of pixels for no reason at all.
 *
 * Picking is a pure function with the die passed in, because "does this look
 * random or does it look like a loop" is otherwise only answerable by staring
 * at the thing for ten minutes.
 */

import { PATCHES, type PetFrame, type PetState } from "./duck";

const {
  blink,
  focusEyes,
  happyEyes,
  zNear,
  zFar,
  sparkleLeft,
  sparkleRight,
  glanceRight,
  lookDown,
  wideEyes,
  note,
  noteFar,
  curious,
  stepLeft,
  stepRight,
} = PATCHES;

export interface Behavior {
  readonly id: string;
  readonly frames: readonly PetFrame[];
  /** Times the frames run before another behaviour is drawn. */
  readonly loops: number;
  /** Relative likelihood per mood. A mood left out is never offered it. */
  readonly weights: Partial<Record<PetState, number>>;
}

/**
 * Durations are deliberately uneven. Frames of equal length beat like a
 * metronome, which is the tell that gives away a two-frame loop.
 */
export const BEHAVIORS: readonly Behavior[] = [
  {
    id: "breathe",
    loops: 2,
    weights: { idle: 7, rest: 2 },
    frames: [
      { patches: [], offsetY: 0, durationMs: 1700 },
      { patches: [blink], offsetY: 0, durationMs: 140 },
      { patches: [], offsetY: 1, durationMs: 1500 },
      { patches: [blink], offsetY: 1, durationMs: 140 },
    ],
  },
  {
    id: "glance",
    loops: 1,
    weights: { idle: 4, rest: 2 },
    frames: [
      { patches: [], offsetY: 0, durationMs: 700 },
      { patches: [glanceRight], offsetY: 0, durationMs: 1100 },
      { patches: [blink], offsetY: 1, durationMs: 130 },
      { patches: [], offsetY: 1, durationMs: 900 },
    ],
  },
  {
    id: "wonder",
    loops: 1,
    weights: { idle: 2 },
    frames: [
      { patches: [wideEyes], offsetY: 0, durationMs: 500 },
      { patches: [wideEyes, curious], offsetY: 0, durationMs: 1400 },
      { patches: [curious], offsetY: 1, durationMs: 700 },
      { patches: [blink], offsetY: 1, durationMs: 150 },
    ],
  },
  {
    id: "doze",
    loops: 2,
    weights: { idle: 2 },
    frames: [
      { patches: [lookDown], offsetY: 1, durationMs: 1600 },
      { patches: [blink], offsetY: 1, durationMs: 400 },
      { patches: [lookDown], offsetY: 0, durationMs: 1300 },
    ],
  },
  {
    id: "shuffle",
    loops: 1,
    weights: { idle: 3, rest: 3 },
    frames: [
      { patches: [stepLeft], offsetX: -1, offsetY: 0, durationMs: 260 },
      { patches: [stepRight], offsetX: -2, offsetY: 1, durationMs: 260 },
      { patches: [stepLeft], offsetX: -3, offsetY: 0, durationMs: 260 },
      { patches: [glanceRight], offsetX: -3, offsetY: 1, durationMs: 900 },
      { patches: [stepRight], offsetX: -2, offsetY: 0, durationMs: 260 },
      { patches: [stepLeft], offsetX: -1, offsetY: 1, durationMs: 260 },
      { patches: [stepRight], offsetX: 0, offsetY: 0, durationMs: 260 },
      { patches: [], offsetY: 1, durationMs: 700 },
    ],
  },
  {
    id: "wander",
    loops: 1,
    weights: { idle: 2 },
    frames: [
      { patches: [stepRight], offsetX: 1, offsetY: 0, durationMs: 240 },
      { patches: [stepLeft], offsetX: 2, offsetY: 1, durationMs: 240 },
      { patches: [stepRight], offsetX: 3, offsetY: 0, durationMs: 240 },
      { patches: [wideEyes], offsetX: 3, offsetY: 1, durationMs: 1000 },
      { patches: [blink], offsetX: 3, offsetY: 0, durationMs: 150 },
      { patches: [stepLeft], offsetX: 2, offsetY: 1, durationMs: 240 },
      { patches: [stepRight], offsetX: 1, offsetY: 0, durationMs: 240 },
      { patches: [stepLeft], offsetX: 0, offsetY: 1, durationMs: 240 },
    ],
  },
  {
    id: "lock-in",
    loops: 3,
    weights: { focus: 8 },
    frames: [
      { patches: [focusEyes], offsetY: 0, durationMs: 900 },
      { patches: [focusEyes], offsetY: 1, durationMs: 900 },
      { patches: [focusEyes], offsetY: 1, durationMs: 900 },
      { patches: [blink], offsetY: 0, durationMs: 130 },
    ],
  },
  {
    id: "scan",
    loops: 1,
    weights: { focus: 3 },
    frames: [
      { patches: [focusEyes], offsetY: 0, durationMs: 800 },
      { patches: [glanceRight], offsetY: 0, durationMs: 900 },
      { patches: [focusEyes], offsetY: 1, durationMs: 1100 },
      { patches: [blink], offsetY: 1, durationMs: 130 },
    ],
  },
  {
    id: "aha",
    loops: 1,
    weights: { focus: 1 },
    frames: [
      { patches: [focusEyes], offsetY: 1, durationMs: 600 },
      { patches: [wideEyes, sparkleRight], offsetY: 0, durationMs: 320 },
      { patches: [wideEyes], offsetY: 0, durationMs: 500 },
      { patches: [focusEyes], offsetY: 1, durationMs: 900 },
    ],
  },
  {
    id: "content",
    loops: 3,
    weights: { rest: 5 },
    frames: [
      { patches: [happyEyes], offsetY: 0, durationMs: 520 },
      { patches: [happyEyes], offsetY: 1, durationMs: 520 },
    ],
  },
  {
    id: "hum",
    loops: 2,
    weights: { rest: 4 },
    frames: [
      { patches: [happyEyes, note], offsetY: 0, durationMs: 620 },
      { patches: [happyEyes], offsetY: 1, durationMs: 500 },
      { patches: [happyEyes, noteFar], offsetY: 0, durationMs: 620 },
      { patches: [happyEyes, note, noteFar], offsetY: 1, durationMs: 500 },
    ],
  },
  {
    id: "cheer",
    loops: 4,
    weights: { celebrate: 1 },
    frames: [
      { patches: [happyEyes, sparkleLeft], offsetY: 0, durationMs: 170 },
      { patches: [happyEyes, sparkleRight], offsetY: 2, durationMs: 170 },
      { patches: [happyEyes, sparkleLeft, sparkleRight], offsetY: 0, durationMs: 170 },
      { patches: [happyEyes], offsetY: 2, durationMs: 170 },
    ],
  },
  {
    id: "snooze",
    loops: 3,
    weights: { sleepy: 6 },
    frames: [
      { patches: [blink, zNear], offsetY: 0, durationMs: 850 },
      { patches: [blink, zNear, zFar], offsetY: 1, durationMs: 850 },
    ],
  },
  {
    id: "deep-sleep",
    loops: 2,
    weights: { sleepy: 3 },
    frames: [
      { patches: [lookDown, zNear], offsetY: 1, durationMs: 1300 },
      { patches: [blink, zNear, zFar], offsetY: 1, durationMs: 1300 },
      { patches: [lookDown, zFar], offsetY: 0, durationMs: 1100 },
    ],
  },
];

/**
 * Draws the next behaviour for a mood.
 *
 * `last` is avoided whenever the mood has anything else on offer, because
 * the same behaviour twice running is exactly what a loop looks like. Returns
 * null only if a mood has no behaviours at all, which a test rules out.
 */
export function pickBehavior(
  state: PetState,
  last: string | undefined,
  roll: number,
  behaviors: readonly Behavior[] = BEHAVIORS,
): Behavior | null {
  const offered = behaviors.filter((behavior) => (behavior.weights[state] ?? 0) > 0);
  if (offered.length === 0) {
    return null;
  }

  const fresh = offered.filter((behavior) => behavior.id !== last);
  const pool = fresh.length > 0 ? fresh : offered;

  const total = pool.reduce((sum, behavior) => sum + (behavior.weights[state] ?? 0), 0);
  let ticket = clamp(roll) * total;

  for (const behavior of pool) {
    ticket -= behavior.weights[state] ?? 0;
    if (ticket < 0) {
      return behavior;
    }
  }

  // A roll of exactly 1 spends the whole ticket without ever going negative,
  // and lands here. Shaving the roll instead would make any behaviour weighted
  // below the shaved amount unreachable.
  return pool[pool.length - 1] ?? null;
}

/** Garbage in means the first bucket, which at least is deterministic. */
function clamp(roll: number): number {
  return Number.isFinite(roll) && roll > 0 ? Math.min(roll, 1) : 0;
}
