/**
 * Chooses what the mascot says. Pure: no DOM, no clock, no randomness of its
 * own — `now` and `random` both arrive as arguments so the awkward cases
 * (cooldowns, repeats, hour windows) are testable without running the app.
 */

import { AMBIENT_TRIGGERS, type Line, type Trigger, type Voice } from "../messages/types";

/**
 * Quiet period before ambient chatter is allowed again. Any line at all
 * restarts it, so a burst of phase events also pushes the idle talk away.
 */
export const AMBIENT_GAP_MS = 9 * 60_000;

/** How many recent lines to remember, so the same one is not repeated. */
const MEMORY = 8;

export interface DialogueState {
  /** Epoch millis of the last line actually spoken; 0 means never. */
  readonly lastSpokeAt: number;
  /** Ids of the most recent lines, newest first. */
  readonly recent: readonly string[];
}

export const INITIAL_DIALOGUE: DialogueState = { lastSpokeAt: 0, recent: [] };

export interface DialogueRequest {
  readonly trigger: Trigger;
  readonly voice: Voice;
  readonly now: number;
  /** Focus rounds completed today, for lines that only fit a certain tally. */
  readonly completedToday: number;
  /** Local hour, 0-23, for lines that only make sense at some times. */
  readonly hour: number;
}

export interface DialogueResult {
  readonly state: DialogueState;
  /** Null whenever the mascot should stay quiet. */
  readonly line: Line | null;
}

export function speak(
  state: DialogueState,
  request: DialogueRequest,
  catalog: readonly Line[],
  random: () => number = Math.random,
): DialogueResult {
  if (request.voice === "off") {
    return { state, line: null };
  }

  if (AMBIENT_TRIGGERS.has(request.trigger) && !cooledDown(state, request.now)) {
    return { state, line: null };
  }

  const candidates = catalog.filter((line) => matches(line, request));
  const line = choose(candidates, state.recent, random);
  if (!line) {
    return { state, line: null };
  }

  return {
    state: {
      lastSpokeAt: request.now,
      recent: [line.id, ...state.recent.filter((id) => id !== line.id)].slice(0, MEMORY),
    },
    line,
  };
}

/**
 * Clears the ambient cooldown so the very next request is allowed through.
 *
 * Used when the user picks a voice in settings: the mascot demonstrates the
 * new tone right away instead of leaving them to guess what they chose.
 */
export function allowAmbient(state: DialogueState): DialogueState {
  return { ...state, lastSpokeAt: 0 };
}

function cooledDown(state: DialogueState, now: number): boolean {
  return now - state.lastSpokeAt >= AMBIENT_GAP_MS;
}

function matches(line: Line, request: DialogueRequest): boolean {
  return (
    line.trigger === request.trigger &&
    line.tone === request.voice &&
    (line.minCompleted === undefined || request.completedToday >= line.minCompleted) &&
    (line.maxCompleted === undefined || request.completedToday <= line.maxCompleted) &&
    withinHours(line.hours, request.hour)
  );
}

/** `[22, 5]` means the late shift, so a window is allowed to wrap midnight. */
function withinHours(hours: readonly [number, number] | undefined, hour: number): boolean {
  if (!hours) {
    return true;
  }

  const [from, to] = hours;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

/**
 * Prefers lines that have not come up lately. Falls back to the whole set once
 * they have all been used — repeating beats saying nothing.
 */
function choose(
  candidates: readonly Line[],
  recent: readonly string[],
  random: () => number,
): Line | null {
  if (candidates.length === 0) {
    return null;
  }

  const fresh = candidates.filter((line) => !recent.includes(line.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));

  return pool[index] ?? null;
}
