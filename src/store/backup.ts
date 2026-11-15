import type { HistoryState } from "../core/history";
import type { TasksState } from "../core/tasks";
import type { Language } from "../i18n/language";
import { t } from "../i18n/strings";
import { isImportableHistory, loadHistory, saveHistory } from "./history";
import type { JsonStore } from "./persistence";
import {
  isImportablePreferences,
  loadPreferences,
  savePreferences,
  type Preferences,
} from "./preferences";
import { isImportableTasks, loadTasks, saveTasks } from "./tasks";

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
  language: Language,
): RestoreResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, error: t("settings.importInvalidJson", language) };
  }

  if (!isRecord(parsed)) {
    return { success: false, error: t("settings.importNotAnObject", language) };
  }

  const rawHistory = readSection(parsed, "history", "pixel-pomodoro-pet:history", isImportableHistory);
  const rawTasks = readSection(parsed, "tasks", "pixel-pomodoro-pet:tasks", isImportableTasks);
  const rawPreferences = readSection(
    parsed,
    "preferences",
    "pixel-pomodoro-pet:preferences",
    isImportablePreferences,
  );

  if (rawHistory === undefined && rawTasks === undefined && rawPreferences === undefined) {
    return { success: false, error: t("settings.importInvalidBackup", language) };
  }

  const tempStore: JsonStore = {
    get(key: string) {
      if (key === "pixel-pomodoro-pet:history") return rawHistory;
      if (key === "pixel-pomodoro-pet:tasks") return rawTasks;
      if (key === "pixel-pomodoro-pet:preferences") return rawPreferences;
      return undefined;
    },
    set() {},
  };

  if (rawHistory !== undefined) {
    saveHistory(store, loadHistory(tempStore));
  }
  if (rawTasks !== undefined) {
    saveTasks(store, loadTasks(tempStore));
  }
  if (rawPreferences !== undefined) {
    savePreferences(store, loadPreferences(tempStore, today));
  }

  return { success: true };
}

/**
 * A section worth writing, or undefined when it is missing or would only
 * normalize into a default.
 *
 * A non-object (`null`, an array) still falls through to the legacy storage
 * key. An object the section predicate rejects does not: the loaders fill
 * gaps with defaults, and writing that result would erase data the file
 * never held.
 */
function readSection(
  parsed: Record<string, unknown>,
  key: string,
  legacyKey: string,
  accept: (value: Record<string, unknown>) => boolean,
): Record<string, unknown> | undefined {
  const primary = parsed[key];
  if (isRecord(primary)) {
    return accept(primary) ? primary : undefined;
  }

  const legacy = parsed[legacyKey];
  if (isRecord(legacy)) {
    return accept(legacy) ? legacy : undefined;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
