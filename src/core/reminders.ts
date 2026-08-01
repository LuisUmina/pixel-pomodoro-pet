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
 */

import type { ReminderPack } from "../messages/reminders";
import type { Phase } from "./types";

/**
 * Longest a single tick may bank. A slept machine hands back an enormous gap,
 * and without a ceiling that one tick would make every pack overdue at once.
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
  /** Wall time since the previous check. */
  readonly sinceMs: number;
  readonly phase: Phase;
  /** Reminders ride on the session, so a stopped timer banks nothing. */
  readonly running: boolean;
  /** Pack id to whether the user wants it. */
  readonly enabled: Readonly<Record<string, boolean>>;
  /** False while the mascot is silenced — quiet mode, or no voice at all. */
  readonly delivering: boolean;
}

export interface ReminderTick {
  readonly state: ReminderState;
  /** Null unless a pack came due on this tick. */
  readonly due: { readonly pack: ReminderPack; readonly line: string } | null;
}

export function advanceReminders(
  state: ReminderState,
  check: ReminderCheck,
  packs: readonly ReminderPack[],
  random: () => number = Math.random,
): ReminderTick {
  if (!check.running || !check.delivering) {
    return { state, due: null };
  }

  const banked = { ...state.banked };
  const step = tickSize(check.sinceMs);

  for (const pack of eligible(check, packs)) {
    banked[pack.id] = (banked[pack.id] ?? 0) + step;
  }

  const pack = mostOverdue(banked, check, packs);
  if (!pack) {
    return { state: { banked, lastLine: state.lastLine }, due: null };
  }

  const index = pickLine(pack, state.lastLine[pack.id], random);

  return {
    state: {
      banked: { ...banked, [pack.id]: 0 },
      lastLine: { ...state.lastLine, [pack.id]: index },
    },
    due: { pack, line: pack.lines[index] ?? "" },
  };
}

function tickSize(sinceMs: number): number {
  if (!Number.isFinite(sinceMs) || sinceMs <= 0) {
    return 0;
  }

  return Math.min(sinceMs, MAX_TICK_MS);
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
