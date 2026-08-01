/**
 * Decides when a reminder pack is due. Pure, like the dialogue selector: the
 * clock and the die are arguments, so "does this nag too often" is a test
 * rather than a thing you find out after living with it for a week.
 */

import type { ReminderPack } from "../messages/reminders";
import type { Phase } from "./types";

export interface ReminderState {
  /** Pack id to when it last fired. Absent means it has never fired. */
  readonly firedAt: Readonly<Record<string, number>>;
  /** Pack id to the line index it used last, so it does not repeat itself. */
  readonly lastLine: Readonly<Record<string, number>>;
}

export const INITIAL_REMINDERS: ReminderState = { firedAt: {}, lastLine: {} };

export interface ReminderCheck {
  readonly now: number;
  readonly phase: Phase;
  /** Reminders ride on the session, so a stopped timer nags about nothing. */
  readonly running: boolean;
  /** Pack id to whether the user wants it. */
  readonly enabled: Readonly<Record<string, boolean>>;
}

export interface DueReminder {
  readonly state: ReminderState;
  readonly pack: ReminderPack;
  readonly line: string;
}

/**
 * Starts every pack's clock, so nothing is due the instant the app opens.
 *
 * Without this a fresh install would fire every enabled pack on the first
 * check, which is the worst possible introduction to the feature.
 */
export function startReminders(packs: readonly ReminderPack[], now: number): ReminderState {
  const firedAt: Record<string, number> = {};
  for (const pack of packs) {
    firedAt[pack.id] = now;
  }

  return { firedAt, lastLine: {} };
}

export function dueReminder(
  state: ReminderState,
  check: ReminderCheck,
  packs: readonly ReminderPack[],
  random: () => number = Math.random,
): DueReminder | null {
  if (!check.running) {
    return null;
  }

  const pack = mostOverdue(state, check, packs);
  if (!pack) {
    return null;
  }

  const index = pickLine(pack, state.lastLine[pack.id], random);

  return {
    state: {
      firedAt: { ...state.firedAt, [pack.id]: check.now },
      lastLine: { ...state.lastLine, [pack.id]: index },
    },
    pack,
    line: pack.lines[index] ?? "",
  };
}

/**
 * The pack that has waited longest past its cadence.
 *
 * Two packs coming due in the same minute is normal — their cadences are
 * whole minutes and share a start — so the tie has to break on something
 * stable rather than on array order.
 */
function mostOverdue(
  state: ReminderState,
  check: ReminderCheck,
  packs: readonly ReminderPack[],
): ReminderPack | null {
  let best: ReminderPack | null = null;
  let bestLateBy = 0;

  for (const pack of packs) {
    if (check.enabled[pack.id] !== true) {
      continue;
    }

    if (!pack.phases.includes(check.phase)) {
      continue;
    }

    const last = state.firedAt[pack.id];
    // A pack with no recorded start is due now; `startReminders` normally
    // prevents that, but a pack added after a release would land here.
    const lateBy = last === undefined ? Infinity : check.now - last - pack.everyMinutes * 60_000;

    if (lateBy >= 0 && (best === null || lateBy > bestLateBy)) {
      best = pack;
      bestLateBy = lateBy;
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
