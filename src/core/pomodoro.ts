import type {
  Phase,
  PomodoroEvent,
  PomodoroSettings,
  PomodoroState,
  Transition,
} from "./types";

const MS_PER_MINUTE = 60_000;

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsPerCycle: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
};

export function phaseDurationMs(phase: Phase, settings: PomodoroSettings): number {
  switch (phase) {
    case "focus":
      return settings.focusMinutes * MS_PER_MINUTE;
    case "shortBreak":
      return settings.shortBreakMinutes * MS_PER_MINUTE;
    case "longBreak":
      return settings.longBreakMinutes * MS_PER_MINUTE;
  }
}

export function isBreak(phase: Phase): boolean {
  return phase !== "focus";
}

export function createInitialState(
  settings: PomodoroSettings,
  overrides: Partial<PomodoroState> = {},
): PomodoroState {
  const totalMs = phaseDurationMs("focus", settings);

  return {
    phase: "focus",
    status: "idle",
    remainingMs: totalMs,
    totalMs,
    round: 0,
    completedToday: 0,
    task: "",
    ...overrides,
  };
}

/** Fraction of the current phase already spent, clamped to 0..1. */
export function progress(state: PomodoroState): number {
  if (state.totalMs <= 0) {
    return 0;
  }

  const elapsed = (state.totalMs - state.remainingMs) / state.totalMs;
  return Math.min(1, Math.max(0, elapsed));
}

/**
 * The whole timer, as a pure function. Keeping it free of timers and DOM is
 * what makes the awkward cases (long breaks, skipping, auto-start) testable.
 */
export function reduce(
  state: PomodoroState,
  event: PomodoroEvent,
  settings: PomodoroSettings,
): Transition {
  switch (event.type) {
    case "start":
      return { state: state.status === "running" ? state : { ...state, status: "running" } };

    case "pause":
      return { state: state.status === "running" ? { ...state, status: "paused" } : state };

    case "toggle":
      return reduce(state, { type: state.status === "running" ? "pause" : "start" }, settings);

    case "reset": {
      const totalMs = phaseDurationMs(state.phase, settings);
      return { state: { ...state, status: "idle", remainingMs: totalMs, totalMs } };
    }

    case "skip":
      return advance(state, settings, false);

    case "tick": {
      if (state.status !== "running") {
        return { state };
      }

      const remainingMs = state.remainingMs - event.elapsedMs;
      return remainingMs > 0
        ? { state: { ...state, remainingMs } }
        : advance(state, settings, true);
    }

    case "setTask":
      return { state: { ...state, task: event.task } };
  }
}

/**
 * Moves to the next phase. `earned` is false when the user skipped, which
 * keeps the round counter — and therefore the long break — honest.
 */
function advance(
  state: PomodoroState,
  settings: PomodoroSettings,
  earned: boolean,
): Transition {
  const finished = state.phase;
  const credited = earned && finished === "focus";

  let round = credited ? state.round + 1 : state.round;
  const next: Phase =
    finished === "focus"
      ? round > 0 && round % settings.roundsPerCycle === 0
        ? "longBreak"
        : "shortBreak"
      : "focus";

  // A long break closes the cycle, so the next focus starts a fresh count.
  if (finished === "longBreak") {
    round = 0;
  }

  const totalMs = phaseDurationMs(next, settings);
  const autoStart =
    earned && (next === "focus" ? settings.autoStartFocus : settings.autoStartBreaks);

  return {
    state: {
      ...state,
      phase: next,
      status: autoStart ? "running" : "idle",
      remainingMs: totalMs,
      totalMs,
      round,
      completedToday: credited ? state.completedToday + 1 : state.completedToday,
    },
    ...(earned ? { completed: finished } : {}),
  };
}
