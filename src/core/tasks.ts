/**
 * A small checklist for the day: what you're working on now, what's queued,
 * what's done. Pure, like the rest of `core/` — an id and a day arrive as
 * arguments wherever one is needed, so creating a task is provable without
 * wiring up `crypto.randomUUID()` or a clock.
 *
 * Deliberately thin. Only one thing here is a real rule rather than plain
 * bookkeeping: typing into the task field always renames whichever task is
 * active, it never creates a second one. A new task is always an explicit
 * choice, made from the task panel.
 */

import { isoDay } from "./format";

/** Caps a task's name the same way the old free-text field capped itself. */
export const TASK_TEXT_MAX_LENGTH = 48;

/** Nobody is estimating a task at three digits of pomodoros. */
export const MAX_ESTIMATE = 20;

export interface Task {
  readonly id: string;
  readonly text: string;
  /** 0 means no estimate was given -- shown as a plain count, not `x/0`. */
  readonly estimatePomodoros: number;
  readonly completedPomodoros: number;
  readonly done: boolean;
  /** ISO day the task was created on. Tasks never expire on their own. */
  readonly createdAt: string;
}

export interface TasksState {
  readonly tasks: readonly Task[];
  /** Null when nothing is active -- the widget shows its empty placeholder. */
  readonly activeId: string | null;
}

export const INITIAL_TASKS: TasksState = { tasks: [], activeId: null };

/**
 * What the task input field does on every keystroke. If a task is already
 * active, this only ever renames it -- including down to an empty string,
 * the same as clearing the field always could. If nothing is active yet, a
 * non-empty keystroke creates the first task and activates it; an empty one
 * is a no-op, so an untouched app never grows a stray blank task.
 */
export function renameActive(
  state: TasksState,
  text: string,
  newId: string,
  today: string = isoDay(new Date()),
): TasksState {
  const capped = text.slice(0, TASK_TEXT_MAX_LENGTH);

  if (state.activeId === null) {
    if (capped === "") {
      return state;
    }

    const task: Task = {
      id: newId,
      text: capped,
      estimatePomodoros: 0,
      completedPomodoros: 0,
      done: false,
      createdAt: today,
    };

    return { tasks: [...state.tasks, task], activeId: task.id };
  }

  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === state.activeId ? { ...task, text: capped } : task,
    ),
  };
}

/** Adds a task from the panel, queued but not active until picked. */
export function addTask(
  state: TasksState,
  text: string,
  estimatePomodoros: number,
  newId: string,
  today: string = isoDay(new Date()),
): TasksState {
  const capped = text.trim().slice(0, TASK_TEXT_MAX_LENGTH);
  if (capped === "") {
    return state;
  }

  const task: Task = {
    id: newId,
    text: capped,
    estimatePomodoros: clampEstimate(estimatePomodoros),
    completedPomodoros: 0,
    done: false,
    createdAt: today,
  };

  return { ...state, tasks: [...state.tasks, task] };
}

/**
 * Switches the active task without retyping its name. A done task cannot
 * become active this way -- the same rule `toggleDone` already enforces by
 * clearing `activeId` the moment a task finishes, kept here too so nothing
 * that calls `setActive` directly has to remember to check `done` itself.
 */
export function setActive(state: TasksState, id: string): TasksState {
  const task = state.tasks.find((candidate) => candidate.id === id);
  return task && !task.done ? { ...state, activeId: id } : state;
}

/**
 * Toggling the active task done also clears `activeId`: a finished task has
 * no business quietly collecting more pomodoros, and the field going back to
 * empty is the same signal an idle timer already gives.
 */
export function toggleDone(state: TasksState, id: string): TasksState {
  const task = state.tasks.find((candidate) => candidate.id === id);
  if (!task) {
    return state;
  }

  const done = !task.done;
  return {
    tasks: state.tasks.map((candidate) =>
      candidate.id === id ? { ...candidate, done } : candidate,
    ),
    activeId: done && state.activeId === id ? null : state.activeId,
  };
}

export function removeTask(state: TasksState, id: string): TasksState {
  return {
    tasks: state.tasks.filter((task) => task.id !== id),
    activeId: state.activeId === id ? null : state.activeId,
  };
}

/**
 * A closed focus session's one job here: credit the task that was active
 * when it started. A no-op with nothing active, same as today recording to
 * no task at all.
 */
export function attributePomodoro(state: TasksState): TasksState {
  if (state.activeId === null) {
    return state;
  }

  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === state.activeId
        ? { ...task, completedPomodoros: task.completedPomodoros + 1 }
        : task,
    ),
  };
}

/** What the task field should show. Empty when nothing is active. */
export function activeTaskText(state: TasksState): string {
  return state.tasks.find((task) => task.id === state.activeId)?.text ?? "";
}

function clampEstimate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_ESTIMATE, Math.max(0, Math.round(value)));
}
