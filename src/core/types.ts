/** The three kinds of interval a pomodoro cycle alternates between. */
export type Phase = "focus" | "shortBreak" | "longBreak";

export type TimerStatus = "idle" | "running" | "paused";

export interface PomodoroSettings {
  readonly focusMinutes: number;
  readonly shortBreakMinutes: number;
  readonly longBreakMinutes: number;
  /** Focus rounds to complete before earning a long break. */
  readonly roundsPerCycle: number;
  readonly autoStartBreaks: boolean;
  readonly autoStartFocus: boolean;
}

export interface PomodoroState {
  readonly phase: Phase;
  readonly status: TimerStatus;
  readonly remainingMs: number;
  /** Full length of the current phase, for the progress bar. */
  readonly totalMs: number;
  /** Focus rounds completed inside the current cycle. */
  readonly round: number;
  /** Focus rounds completed today, across cycles. */
  readonly completedToday: number;
  readonly task: string;
}

export type PomodoroEvent =
  | { readonly type: "start" }
  | { readonly type: "pause" }
  | { readonly type: "toggle" }
  | { readonly type: "reset" }
  | { readonly type: "skip" }
  | { readonly type: "tick"; readonly elapsedMs: number }
  | { readonly type: "setTask"; readonly task: string };

export interface Transition {
  readonly state: PomodoroState;
  /**
   * Set only when a phase ran all the way down to zero. The UI turns this into
   * a notification, a sound and the celebrate animation; skipping earns none
   * of that on purpose.
   */
  readonly completed?: Phase;
}
