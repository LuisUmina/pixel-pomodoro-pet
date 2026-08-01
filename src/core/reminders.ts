/**
 * Decides when a reminder pack is due. Pure, like the dialogue selector: the
 * clock and the die are arguments, so "does this nag too often" is a test
 * rather than a thing you find out after living with it for a week.
 *
 * Packs bank *eligible* time rather than watching the wall clock. The
 * difference is the whole feature: the 20-20-20 rule counts twenty minutes of
 * looking at a screen, so twenty minutes with the widget sitting idle must not
 * make it due the moment a session finally starts. The same rule means nothing
 * accrues while the mascot is silenced, which is also what stops a silenced
 * stretch turning into a backlog that empties itself one line per minute.
 *
 * Banking and firing are separate calls on purpose. Time is banked from the
 * pomodoro ticker, which already measures real elapsed time several times a
 * second and only runs during a session — a once-a-minute poll would have to
 * guess which side of a pause or a phase change each interval belonged to.
 * Firing is a separate decision because the caller sometimes has something
 * more important to say, and a reminder that is held back has to keep its
 * bank rather than be quietly spent.
 */

import type { ReminderPack } from "../messages/reminders";
import type { Phase } from "./types";

/**
 * Longest a single slice may bank. A slept or suspended machine hands the
 * ticker back an enormous gap, and without a ceiling that one slice would
 * make every pack overdue at once.
 */
export const MAX_TICK_MS = 2 * 60_000;

export interface ReminderState {
  /** Pack id to the eligible milliseconds banked since it last fired. */
  readonly banked: Readonly<Record<string, number>>;
  /** Pack id to the line index it used last, so it does not repeat itself. */
  readonly lastLine: Readonly<Record<string, number>>;
}

/** Everything starts from zero, so nothing is due when the app opens. */
export const INITIAL_REMINDERS: ReminderState = { banked: {}, lastLine: {} };

export interface ReminderCheck {
  readonly phase: Phase;
  /** Pack id to whether the user wants it. */
  readonly enabled: Readonly<Record<string, boolean>>;
}

export interface TakenReminder {
  readonly state: ReminderState;
  readonly pack: ReminderPack;
  readonly line: string;
}

/**
 * Banks a slice of session time against every pack the slice counted for.
 *
 * `elapsedMs` comes from the pomodoro ticker, so it is time actually spent in
 * this phase with the timer running. Nothing is banked while the mascot is
 * silenced: that is what keeps a quiet spell from becoming a queue.
 */
export function accrueReminders(
  state: ReminderState,
  elapsedMs: number,
  check: ReminderCheck & { readonly delivering: boolean },
  packs: readonly ReminderPack[],
): ReminderState {
  const step = sliceSize(elapsedMs);
  if (step === 0 || !check.delivering) {
    return state;
  }

  const banked = { ...state.banked };
  for (const pack of eligible(check, packs)) {
    banked[pack.id] = (banked[pack.id] ?? 0) + step;
  }

  return { banked, lastLine: state.lastLine };
}

/**
 * Takes whichever pack has waited longest past its cadence, spending its bank.
 *
 * Returns null rather than throwing away time when nothing is due, so a caller
 * that skips a turn — because a phase just ended and has its own line — simply
 * finds the same pack waiting on the next tick.
 */
export function takeReminder(
  state: ReminderState,
  check: ReminderCheck,
  packs: readonly ReminderPack[],
  random: () => number = Math.random,
): TakenReminder | null {
  const pack = mostOverdue(state.banked, check, packs);
  if (!pack) {
    return null;
  }

  const index = pickLine(pack, state.lastLine[pack.id], random);

  return {
    state: {
      banked: { ...state.banked, [pack.id]: 0 },
      lastLine: { ...state.lastLine, [pack.id]: index },
    },
    pack,
    line: pack.lines[index] ?? "",
  };
}

function sliceSize(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return 0;
  }

  return Math.min(elapsedMs, MAX_TICK_MS);
}

function eligible(
  check: ReminderCheck,
  packs: readonly ReminderPack[],
): readonly ReminderPack[] {
  return packs.filter(
    (pack) => check.enabled[pack.id] === true && pack.phases.includes(check.phase),
  );
}

/**
 * The pack that has banked the most beyond its cadence.
 *
 * Two packs coming due on the same tick is normal — their cadences are whole
 * minutes and they start together — so the tie has to break on something
 * stable rather than on the order they happen to sit in the file.
 */
function mostOverdue(
  banked: Readonly<Record<string, number>>,
  check: ReminderCheck,
  packs: readonly ReminderPack[],
): ReminderPack | null {
  let best: ReminderPack | null = null;
  let bestOver = 0;

  for (const pack of eligible(check, packs)) {
    const over = (banked[pack.id] ?? 0) - pack.everyMinutes * 60_000;

    if (over >= 0 && (best === null || over > bestOver)) {
      best = pack;
      bestOver = over;
    }
  }

  return best;
}

function pickLine(pack: ReminderPack, last: number | undefined, random: () => number): number {
  if (pack.lines.length < 2) {
    return 0;
  }

  // Draw from the other lines, so the same one never lands twice running.
  const others = pack.lines.length - (last === undefined ? 0 : 1);
  const drawn = Math.min(others - 1, Math.floor(random() * others));

  if (last === undefined) {
    return drawn;
  }

  return drawn >= last ? drawn + 1 : drawn;
}

/** Every pack switched to its shipped default, for a fresh install. */
export function defaultEnabled(packs: readonly ReminderPack[]): Record<string, boolean> {
  const enabled: Record<string, boolean> = {};
  for (const pack of packs) {
    enabled[pack.id] = pack.enabledByDefault;
  }

  return enabled;
}
