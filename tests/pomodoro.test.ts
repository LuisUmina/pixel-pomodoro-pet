import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  createInitialState,
  phaseDurationMs,
  progress,
  reduce,
  withSettings,
} from "../src/core/pomodoro";
import type { PomodoroEvent, PomodoroSettings, PomodoroState } from "../src/core/types";

const settings: PomodoroSettings = { ...DEFAULT_SETTINGS, roundsPerCycle: 4 };

/** Applies a list of events in order and returns the last transition. */
function run(state: PomodoroState, events: readonly PomodoroEvent[], config = settings) {
  return events.reduce(
    (transition, event) => reduce(transition.state, event, config),
    { state } as ReturnType<typeof reduce>,
  );
}

/** Runs the current phase all the way down to zero. */
function finishPhase(state: PomodoroState, config = settings) {
  return run(state, [{ type: "start" }, { type: "tick", elapsedMs: state.totalMs }], config);
}

describe("createInitialState", () => {
  it("opens on an idle focus phase at full length", () => {
    const state = createInitialState(settings);

    expect(state.phase).toBe("focus");
    expect(state.status).toBe("idle");
    expect(state.remainingMs).toBe(phaseDurationMs("focus", settings));
    expect(state.remainingMs).toBe(state.totalMs);
  });
});

describe("start / pause / toggle", () => {
  it("toggles between running and paused", () => {
    const idle = createInitialState(settings);

    const running = reduce(idle, { type: "toggle" }, settings).state;
    expect(running.status).toBe("running");

    const paused = reduce(running, { type: "toggle" }, settings).state;
    expect(paused.status).toBe("paused");
  });

  it("keeps the remaining time when pausing", () => {
    const { state } = run(createInitialState(settings), [
      { type: "start" },
      { type: "tick", elapsedMs: 60_000 },
      { type: "pause" },
    ]);

    expect(state.remainingMs).toBe(phaseDurationMs("focus", settings) - 60_000);
  });
});

describe("tick", () => {
  it("ignores ticks while idle or paused", () => {
    const idle = createInitialState(settings);
    const after = reduce(idle, { type: "tick", elapsedMs: 5_000 }, settings).state;

    expect(after).toEqual(idle);
  });

  it("counts down while running", () => {
    const { state } = run(createInitialState(settings), [
      { type: "start" },
      { type: "tick", elapsedMs: 1_000 },
      { type: "tick", elapsedMs: 1_000 },
    ]);

    expect(state.remainingMs).toBe(phaseDurationMs("focus", settings) - 2_000);
  });
});

describe("phase completion", () => {
  it("reports the finished phase and moves into a short break", () => {
    const transition = finishPhase(createInitialState(settings));

    expect(transition.completed).toBe("focus");
    expect(transition.state.phase).toBe("shortBreak");
    expect(transition.state.remainingMs).toBe(phaseDurationMs("shortBreak", settings));
  });

  it("credits the round and the daily count only on a real completion", () => {
    const transition = finishPhase(createInitialState(settings));

    expect(transition.state.round).toBe(1);
    expect(transition.state.completedToday).toBe(1);
  });

  it("auto-starts breaks but not the next focus, per settings", () => {
    const afterFocus = finishPhase(createInitialState(settings));
    expect(afterFocus.state.status).toBe("running");

    const afterBreak = finishPhase(afterFocus.state);
    expect(afterBreak.state.phase).toBe("focus");
    expect(afterBreak.state.status).toBe("idle");
  });

  it("earns a long break on the fourth focus round and then resets the cycle", () => {
    let state = createInitialState(settings);

    for (let round = 1; round <= 3; round += 1) {
      state = finishPhase(state).state;
      expect(state.phase).toBe("shortBreak");
      state = finishPhase(state).state;
    }

    state = finishPhase(state).state;
    expect(state.phase).toBe("longBreak");
    expect(state.round).toBe(4);

    state = finishPhase(state).state;
    expect(state.phase).toBe("focus");
    expect(state.round).toBe(0);
    expect(state.completedToday).toBe(4);
  });
});

describe("skip", () => {
  it("moves on without crediting the round or announcing a completion", () => {
    const running = reduce(createInitialState(settings), { type: "start" }, settings).state;
    const transition = reduce(running, { type: "skip" }, settings);

    expect(transition.completed).toBeUndefined();
    expect(transition.state.phase).toBe("shortBreak");
    expect(transition.state.round).toBe(0);
    expect(transition.state.completedToday).toBe(0);
  });

  it("leaves the next phase idle, since nothing was earned", () => {
    const running = reduce(createInitialState(settings), { type: "start" }, settings).state;
    const { state } = reduce(running, { type: "skip" }, settings);

    expect(state.status).toBe("idle");
  });

  it("never lets skipped rounds add up to a long break", () => {
    let state = createInitialState(settings);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      state = reduce(state, { type: "skip" }, settings).state;
      expect(state.phase).not.toBe("longBreak");
    }
  });
});

describe("reset", () => {
  it("restores the full duration of the current phase and stops it", () => {
    const { state } = run(createInitialState(settings), [
      { type: "start" },
      { type: "tick", elapsedMs: 120_000 },
      { type: "reset" },
    ]);

    expect(state.status).toBe("idle");
    expect(state.remainingMs).toBe(phaseDurationMs("focus", settings));
  });
});

describe("setTask", () => {
  it("stores the task without disturbing the timer", () => {
    const running = reduce(createInitialState(settings), { type: "start" }, settings).state;
    const { state } = reduce(running, { type: "setTask", task: "refactor auth" }, settings);

    expect(state.task).toBe("refactor auth");
    expect(state.status).toBe("running");
    expect(state.remainingMs).toBe(running.remainingMs);
  });
});

describe("withSettings", () => {
  it("stretches an idle phase to the new duration", () => {
    const state = createInitialState(settings);
    const longer = withSettings(state, { ...settings, focusMinutes: 50 });

    expect(longer.totalMs).toBe(50 * 60_000);
    expect(longer.remainingMs).toBe(50 * 60_000);
  });

  it("keeps the time left on a running phase", () => {
    const { state } = run(createInitialState(settings), [
      { type: "start" },
      { type: "tick", elapsedMs: 60_000 },
    ]);

    const stretched = withSettings(state, { ...settings, focusMinutes: 50 });

    expect(stretched.remainingMs).toBe(state.remainingMs);
    expect(stretched.totalMs).toBe(50 * 60_000);
  });

  it("clamps the time left so it can never exceed the new total", () => {
    const { state } = run(createInitialState(settings), [
      { type: "start" },
      { type: "tick", elapsedMs: 60_000 },
    ]);

    const shortened = withSettings(state, { ...settings, focusMinutes: 5 });

    expect(shortened.totalMs).toBe(5 * 60_000);
    expect(shortened.remainingMs).toBe(5 * 60_000);
    expect(progress(shortened)).toBe(0);
  });

  it("leaves the state untouched when the duration did not move", () => {
    const state = createInitialState(settings);

    expect(withSettings(state, { ...settings, shortBreakMinutes: 9 })).toBe(state);
  });

  it("only touches the phase currently on screen", () => {
    const state = createInitialState(settings);
    const changed = withSettings(state, { ...settings, longBreakMinutes: 30 });

    expect(changed).toBe(state);
    expect(phaseDurationMs("longBreak", { ...settings, longBreakMinutes: 30 })).toBe(
      30 * 60_000,
    );
  });
});

describe("progress", () => {
  it("runs from 0 to 1 across a phase", () => {
    const state = createInitialState(settings);
    expect(progress(state)).toBe(0);

    const halfway = reduce(
      reduce(state, { type: "start" }, settings).state,
      { type: "tick", elapsedMs: state.totalMs / 2 },
      settings,
    ).state;

    expect(progress(halfway)).toBeCloseTo(0.5);
  });

  it("stays clamped if the clock overshoots", () => {
    const state = createInitialState(settings);
    expect(progress({ ...state, remainingMs: -10_000 })).toBe(1);
    expect(progress({ ...state, remainingMs: state.totalMs * 2 })).toBe(0);
  });
});
