import { describe, expect, it } from "vitest";
import { isoDay } from "../src/core/format";
import {
  createBackup,
  exportBackupJson,
  restoreBackupJson,
} from "../src/store/backup";
import { loadHistory, saveHistory } from "../src/store/history";
import { memoryStore } from "../src/store/persistence";
import { loadPreferences, savePreferences } from "../src/store/preferences";
import { loadTasks, saveTasks } from "../src/store/tasks";

const TODAY = isoDay(new Date(2026, 7, 2));

describe("backup store", () => {
  it("exports current history, tasks, and preferences into a BackupPayload", () => {
    const store = memoryStore();

    saveHistory(store, {
      days: { "2026-08-01": 4 },
      totalSessions: 4,
      bestDayCount: 4,
      bestDay: "2026-08-01",
      bestWeekCount: 4,
      bestStreak: 1,
    });

    saveTasks(store, {
      tasks: [
        {
          id: "task-1",
          text: "Write tests",
          section: "",
          estimatePomodoros: 2,
          completedPomodoros: 1,
          done: false,
          createdAt: "2026-08-01T10:00:00.000Z",
        },
      ],
      activeId: "task-1",
    });

    const prefs = loadPreferences(store, TODAY);
    savePreferences(store, { ...prefs, soundEnabled: false });

    const backup = createBackup(store, TODAY);

    expect(backup.version).toBe(1);
    expect(typeof backup.exportedAt).toBe("string");
    expect(backup.history.totalSessions).toBe(4);
    expect(backup.tasks.tasks.length).toBe(1);
    expect(backup.tasks.tasks[0]?.text).toBe("Write tests");
    expect(backup.preferences.soundEnabled).toBe(false);

    const json = exportBackupJson(store, TODAY);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(backup.version);
    expect(parsed.history).toEqual(backup.history);
    expect(parsed.tasks).toEqual(backup.tasks);
    expect(parsed.preferences).toEqual(backup.preferences);
  });

  it("restores backup data into target store defensibly", () => {
    const sourceStore = memoryStore();
    saveHistory(sourceStore, {
      days: { "2026-08-01": 5 },
      totalSessions: 5,
      bestDayCount: 5,
      bestDay: "2026-08-01",
      bestWeekCount: 5,
      bestStreak: 1,
    });
    saveTasks(sourceStore, {
      tasks: [
        {
          id: "t-100",
          text: "Task from backup",
          section: "",
          estimatePomodoros: 3,
          completedPomodoros: 3,
          done: true,
          createdAt: "2026-08-01T12:00:00.000Z",
        },
      ],
      activeId: null,
    });

    const backupJson = exportBackupJson(sourceStore, TODAY);

    const targetStore = memoryStore();
    const result = restoreBackupJson(targetStore, backupJson, TODAY);

    expect(result.success).toBe(true);

    const restoredHistory = loadHistory(targetStore);
    expect(restoredHistory.totalSessions).toBe(5);
    expect(restoredHistory.days["2026-08-01"]).toBe(5);

    const restoredTasks = loadTasks(targetStore);
    expect(restoredTasks.tasks.length).toBe(1);
    expect(restoredTasks.tasks[0]?.text).toBe("Task from backup");
  });

  it("handles malformed JSON gracefully", () => {
    const store = memoryStore();
    const result = restoreBackupJson(store, "{ invalid json ...", TODAY);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Formato JSON inválido.");
  });

  it("handles non-object JSON gracefully", () => {
    const store = memoryStore();
    const result = restoreBackupJson(store, "12345", TODAY);

    expect(result.success).toBe(false);
    expect(result.error).toBe("El contenido del archivo no es un objeto válido.");
  });

  it("sanitizes corrupt fields upon restoration using defensive store loaders", () => {
    const store = memoryStore();
    const corruptBackup = JSON.stringify({
      version: 1,
      history: {
        totalSessions: "not-a-number",
        days: { "invalid-date": 10, "2026-08-01": -5 },
      },
      tasks: {
        tasks: [{ id: "", text: null }],
        activeId: "non-existent-id",
      },
      preferences: {
        soundEnabled: "maybe",
        uiScale: 9999,
      },
    });

    const result = restoreBackupJson(store, corruptBackup, TODAY);
    expect(result.success).toBe(true);

    const history = loadHistory(store);
    expect(history.totalSessions).toBe(0);
    expect(history.days).toEqual({});

    const tasks = loadTasks(store);
    expect(tasks.tasks).toEqual([]);
    expect(tasks.activeId).toBeNull();

    const prefs = loadPreferences(store, TODAY);
    expect(prefs.soundEnabled).toBe(true); // default
    expect(prefs.uiScale).toBeLessThanOrEqual(2); // clamped
  });
});
