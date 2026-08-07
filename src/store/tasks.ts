import {
  INITIAL_TASKS,
  MAX_ESTIMATE,
  normalizeSection,
  TASK_TEXT_MAX_LENGTH,
  type Task,
  type TasksState,
} from "../core/tasks";
import type { JsonStore } from "./persistence";

const STORAGE_KEY = "pixel-pomodoro-pet:tasks";

/** Where the free-text task field lived before this store existed. */
const LEGACY_PREFERENCES_KEY = "pixel-pomodoro-pet:preferences";

/**
 * Reads the checklist defensively, the same way `store/history.ts` and
 * `store/preferences.ts` do: anything missing or malformed falls back rather
 * than propagating into the panel. An `activeId` that no longer points at a
 * real, unfinished task -- the one thing that would otherwise crash
 * `activeTaskText` or let a done task keep quietly collecting pomodoros --
 * falls back to null instead of being trusted as-is.
 */
export function loadTasks(store: JsonStore): TasksState {
  const raw = store.get(STORAGE_KEY);
  if (!isRecord(raw)) {
    return INITIAL_TASKS;
  }

  const tasks = Array.isArray(raw["tasks"]) ? raw["tasks"].map(readTask).filter(isTask) : [];

  const activeId = raw["activeId"];
  const activeTask = tasks.find((task) => task.id === activeId);
  const active = typeof activeId === "string" && activeTask && !activeTask.done ? activeId : null;

  return { tasks, activeId: active };
}

/**
 * One-time bridge for anyone updating from before this feature existed: the
 * free-text task field used to live directly in preferences. Reads the raw
 * legacy value without going through `loadPreferences`, which no longer
 * knows that field ever existed. Callers only need this when the task store
 * itself is genuinely empty -- past that point the legacy value has either
 * already been migrated or superseded by real use, and re-reading it would
 * only resurrect stale text over whatever is active now.
 */
export function readLegacyTaskText(store: JsonStore): string {
  const raw = store.get(LEGACY_PREFERENCES_KEY);
  if (!isRecord(raw)) {
    return "";
  }

  const task = raw["task"];
  return typeof task === "string" ? task : "";
}

export function saveTasks(store: JsonStore, state: TasksState): void {
  store.set(STORAGE_KEY, state);
}

function readTask(value: unknown): Task | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value["id"];
  const text = value["text"];
  if (typeof id !== "string" || id === "" || typeof text !== "string") {
    return null;
  }

  return {
    id,
    text: text.slice(0, TASK_TEXT_MAX_LENGTH),
    // Tasks saved before sections existed simply belong to no section.
    section: typeof value["section"] === "string" ? normalizeSection(value["section"]) : "",
    estimatePomodoros: readCount(value["estimatePomodoros"], MAX_ESTIMATE),
    completedPomodoros: readCount(value["completedPomodoros"], Number.POSITIVE_INFINITY),
    done: value["done"] === true,
    createdAt: typeof value["createdAt"] === "string" ? value["createdAt"] : "",
  };
}

function isTask(value: Task | null): value is Task {
  return value !== null;
}

function readCount(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.min(max, Math.floor(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
