import type { HistoryState } from "../core/history";
import type { TasksState } from "../core/tasks";
import { loadHistory, saveHistory } from "./history";
import type { JsonStore } from "./persistence";
import { loadPreferences, savePreferences, type Preferences } from "./preferences";
import { loadTasks, saveTasks } from "./tasks";

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  history: HistoryState;
  tasks: TasksState;
  preferences: Preferences;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
}

export function createBackup(store: JsonStore, today: string): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    history: loadHistory(store),
    tasks: loadTasks(store),
    preferences: loadPreferences(store, today),
  };
}

export function exportBackupJson(store: JsonStore, today: string): string {
  return JSON.stringify(createBackup(store, today), null, 2);
}

export function restoreBackupJson(
  store: JsonStore,
  rawJson: string,
  today: string,
): RestoreResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, error: "Formato JSON inválido." };
  }

  if (!isRecord(parsed)) {
    return { success: false, error: "El contenido del archivo no es un objeto válido." };
  }

  const rawHistory = isRecord(parsed["history"])
    ? parsed["history"]
    : parsed["pixel-pomodoro-pet:history"];
  const rawTasks = isRecord(parsed["tasks"])
    ? parsed["tasks"]
    : parsed["pixel-pomodoro-pet:tasks"];
  const rawPreferences = isRecord(parsed["preferences"])
    ? parsed["preferences"]
    : parsed["pixel-pomodoro-pet:preferences"];

  const tempStore: JsonStore = {
    get(key: string) {
      if (key === "pixel-pomodoro-pet:history") return rawHistory;
      if (key === "pixel-pomodoro-pet:tasks") return rawTasks;
      if (key === "pixel-pomodoro-pet:preferences") return rawPreferences;
      return undefined;
    },
    set() {},
  };

  const history = loadHistory(tempStore);
  const tasks = loadTasks(tempStore);
  const preferences = loadPreferences(tempStore, today);

  saveHistory(store, history);
  saveTasks(store, tasks);
  savePreferences(store, preferences);

  return { success: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
