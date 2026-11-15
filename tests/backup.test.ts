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
    savePreferences(store, {
      ...prefs,
      soundEnabled: false,
      customReminders: [{ id: "r1", text: "Tomá agua", everyMinutes: 30, anchor: "break" }],
    });

    const backup = createBackup(store, TODAY);

    expect(backup.version).toBe(1);
    expect(typeof backup.exportedAt).toBe("string");
    expect(backup.history.totalSessions).toBe(4);
    expect(backup.tasks.tasks.length).toBe(1);
    expect(backup.tasks.tasks[0]?.text).toBe("Write tests");
    expect(backup.preferences.soundEnabled).toBe(false);
    expect(backup.preferences.customReminders).toHaveLength(1);

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
    const result = restoreBackupJson(targetStore, backupJson, TODAY, "en");

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
    const result = restoreBackupJson(store, "{ invalid json ...", TODAY, "en");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid JSON file.");
  });

  it("handles non-object JSON gracefully", () => {
    const store = memoryStore();
    const result = restoreBackupJson(store, "12345", TODAY, "en");

    expect(result.success).toBe(false);
    expect(result.error).toBe("That file's contents are not a valid object.");
  });

  it("translates its error messages when restoring in Spanish", () => {
    const store = memoryStore();
    const result = restoreBackupJson(store, "{ invalid json ...", TODAY, "es");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Formato JSON inválido.");
  });

  it("rejects sections that contain no usable data instead of writing defaults", () => {
    const store = seededStore();
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

    const result = restoreBackupJson(store, corruptBackup, TODAY, "en");
    expect(result.success).toBe(false);
    expect(result.error).toBe("That file does not contain valid backup data.");
    expectSeedUnchanged(store);
  });

  it("rejects unrelated JSON objects without wiping existing store data", () => {
    const store = seededStore();

    const resultEn = restoreBackupJson(
      store,
      JSON.stringify({ name: "some-package", version: "1.0.0" }),
      TODAY,
      "en",
    );
    expect(resultEn.success).toBe(false);
    expect(resultEn.error).toBe("That file does not contain valid backup data.");

    const resultEs = restoreBackupJson(store, "{}", TODAY, "es");
    expect(resultEs.success).toBe(false);
    expect(resultEs.error).toBe("El archivo no contiene datos de respaldo válidos.");

    expectSeedUnchanged(store);
  });

  it("rejects arrays and malformed JSON without wiping existing store data", () => {
    const store = seededStore();

    const arrayResult = restoreBackupJson(store, "[]", TODAY, "en");
    expect(arrayResult.success).toBe(false);
    expect(arrayResult.error).toBe("That file's contents are not a valid object.");

    const malformed = restoreBackupJson(store, "{ invalid json ...", TODAY, "en");
    expect(malformed.success).toBe(false);
    expect(malformed.error).toBe("Invalid JSON file.");

    expectSeedUnchanged(store);
  });

  it("restores only the sections present in a partial backup", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({
        history: {
          days: { "2026-08-01": 99 },
          totalSessions: 99,
          bestDayCount: 99,
          bestDay: "2026-08-01",
          bestWeekCount: 99,
          bestStreak: 4,
        },
      }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    expect(loadHistory(store).totalSessions).toBe(99);
    expect(loadTasks(store).tasks[0]?.text).toBe("KEEP-ME");
    expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
  });

  it("does not replace stored history with an empty history object", () => {
    const store = seededStore();

    const result = restoreBackupJson(store, JSON.stringify({ history: {} }), TODAY, "en");

    expect(result.success).toBe(false);
    expect(result.error).toBe("That file does not contain valid backup data.");
    expectSeedUnchanged(store);
  });

  it("does not replace stored history when the history section has no usable days", () => {
    const payloads = [
      { history: { bestStreak: 4 } },
      { history: { days: {} } },
      { history: { totalSessions: "not-a-number", days: { "not-a-day": 10, "2026-08-01": -5 } } },
      { history: [] },
      { history: null },
    ];

    for (const payload of payloads) {
      const store = seededStore();
      const result = restoreBackupJson(store, JSON.stringify(payload), TODAY, "en");

      expect(result.success).toBe(false);
      expect(result.error).toBe("That file does not contain valid backup data.");
      expectSeedUnchanged(store);
    }
  });

  it("keeps stored history when an empty history object arrives with another section", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({
        history: {},
        tasks: {
          tasks: [
            {
              id: "new",
              text: "FROM-TASKS",
              section: "",
              estimatePomodoros: 1,
              completedPomodoros: 0,
              done: false,
              createdAt: "2026-08-01T10:00:00.000Z",
            },
          ],
          activeId: "new",
        },
      }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    expect(loadHistory(store).totalSessions).toBe(7);
    expect(loadHistory(store).days["2026-08-01"]).toBe(7);
    expect(loadTasks(store).tasks[0]?.text).toBe("FROM-TASKS");
    expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
  });

  it("still replaces history when a partial object contains a real session day", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({
        history: { days: { "2026-11-02": 6 }, totalSessions: 6 },
      }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    const history = loadHistory(store);
    expect(history.days).toEqual({ "2026-11-02": 6 });
    expect(history.totalSessions).toBe(6);
    expect(history.bestStreak).toBe(0);
    expect(loadTasks(store).tasks[0]?.text).toBe("KEEP-ME");
    expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
  });

  it("still restores an explicit all-zero history record", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({
        history: {
          days: {},
          totalSessions: 0,
          bestDayCount: 0,
          bestDay: "",
          bestWeekCount: 0,
          bestStreak: 0,
        },
      }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    expect(loadHistory(store).totalSessions).toBe(0);
    expect(loadHistory(store).days).toEqual({});
    expect(loadTasks(store).tasks[0]?.text).toBe("KEEP-ME");
    expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
  });

  it("does not replace stored tasks or preferences with an empty section", () => {
    const store = seededStore();

    const tasksResult = restoreBackupJson(store, JSON.stringify({ tasks: {} }), TODAY, "en");
    expect(tasksResult.success).toBe(false);
    expect(tasksResult.error).toBe("That file does not contain valid backup data.");

    const preferencesResult = restoreBackupJson(
      store,
      JSON.stringify({ preferences: {} }),
      TODAY,
      "en",
    );
    expect(preferencesResult.success).toBe(false);
    expect(preferencesResult.error).toBe("That file does not contain valid backup data.");

    expectSeedUnchanged(store);
  });

  it("does not replace stored tasks or preferences when the section has no usable data", () => {
    const payloads = [
      { tasks: { tasks: [] } },
      { tasks: { tasks: [{ id: "", text: null }], activeId: "missing" } },
      { tasks: [] },
      { tasks: null },
      { preferences: { soundEnabled: "maybe", uiScale: 9999 } },
      { preferences: { settings: { focusMinutes: "long" } } },
      { preferences: { customReminders: [] } },
      { preferences: [] },
      { preferences: null },
    ];

    for (const payload of payloads) {
      const store = seededStore();
      const result = restoreBackupJson(store, JSON.stringify(payload), TODAY, "en");

      expect(result.success).toBe(false);
      expect(result.error).toBe("That file does not contain valid backup data.");
      expectSeedUnchanged(store);
    }
  });

  it("keeps the other sections when one imported section is empty and another is valid", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({
        history: {},
        tasks: {
          tasks: [
            {
              id: "new",
              text: "FROM-TASKS",
              section: "",
              estimatePomodoros: 1,
              completedPomodoros: 0,
              done: false,
              createdAt: "2026-08-01T10:00:00.000Z",
            },
          ],
          activeId: "new",
        },
        preferences: {},
      }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    expect(loadHistory(store).totalSessions).toBe(7);
    expect(loadTasks(store).tasks[0]?.text).toBe("FROM-TASKS");
    expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
  });

  it("still replaces tasks when a partial tasks object contains a real task", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({
        tasks: {
          tasks: [
            {
              id: "partial",
              text: "PARTIAL-TASK",
              section: "",
              estimatePomodoros: 1,
              completedPomodoros: 0,
              done: false,
              createdAt: "2026-08-01T10:00:00.000Z",
            },
          ],
        },
      }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    expect(loadTasks(store).tasks).toHaveLength(1);
    expect(loadTasks(store).tasks[0]?.text).toBe("PARTIAL-TASK");
    expect(loadTasks(store).activeId).toBeNull();
    expect(loadHistory(store).totalSessions).toBe(7);
    expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
  });

  it("still replaces preferences when a partial object contains a real setting", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({ preferences: { soundEnabled: false } }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    const prefs = loadPreferences(store, TODAY);
    expect(prefs.soundEnabled).toBe(false);
    expect(prefs.settings.focusMinutes).toBe(25);
    expect(loadHistory(store).totalSessions).toBe(7);
    expect(loadTasks(store).tasks[0]?.text).toBe("KEEP-ME");
  });

  it("still restores an explicit empty task list", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({ tasks: { tasks: [], activeId: null } }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    expect(loadTasks(store).tasks).toEqual([]);
    expect(loadTasks(store).activeId).toBeNull();
    expect(loadHistory(store).totalSessions).toBe(7);
    expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
  });

  it("round-trips an export of an empty profile", () => {
    const source = memoryStore();
    const json = exportBackupJson(source, TODAY);
    const target = seededStore();

    const result = restoreBackupJson(target, json, TODAY, "en");

    expect(result.success).toBe(true);
    expect(loadHistory(target)).toEqual(loadHistory(source));
    expect(loadTasks(target)).toEqual(loadTasks(source));
    expect(loadPreferences(target, TODAY)).toEqual(loadPreferences(source, TODAY));
  });

  it("does not treat an empty storage-key history object as a backup", () => {
    const store = seededStore();

    const result = restoreBackupJson(
      store,
      JSON.stringify({ "pixel-pomodoro-pet:history": {} }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("That file does not contain valid backup data.");
    expectSeedUnchanged(store);
  });

  it("restores a backup keyed with the storage key names", () => {
    const store = memoryStore();
    const result = restoreBackupJson(
      store,
      JSON.stringify({
        "pixel-pomodoro-pet:history": {
          days: { "2026-08-01": 3 },
          totalSessions: 3,
          bestDayCount: 3,
          bestDay: "2026-08-01",
          bestWeekCount: 3,
          bestStreak: 1,
        },
      }),
      TODAY,
      "en",
    );

    expect(result.success).toBe(true);
    expect(loadHistory(store).totalSessions).toBe(3);
  });
});

const SEED_HISTORY = {
  days: { "2026-08-01": 7 },
  totalSessions: 7,
  bestDayCount: 7,
  bestDay: "2026-08-01",
  bestWeekCount: 7,
  bestStreak: 1,
} as const;

function seededStore() {
  const store = memoryStore();
  saveHistory(store, SEED_HISTORY);
  saveTasks(store, {
    tasks: [
      {
        id: "keep",
        text: "KEEP-ME",
        section: "",
        estimatePomodoros: 2,
        completedPomodoros: 0,
        done: false,
        createdAt: "2026-08-01T10:00:00.000Z",
      },
    ],
    activeId: "keep",
  });
  const prefs = loadPreferences(store, TODAY);
  savePreferences(store, {
    ...prefs,
    settings: { ...prefs.settings, focusMinutes: 33 },
  });
  return store;
}

function expectSeedUnchanged(store: ReturnType<typeof memoryStore>): void {
  expect(loadHistory(store).totalSessions).toBe(7);
  expect(loadTasks(store).tasks[0]?.text).toBe("KEEP-ME");
  expect(loadPreferences(store, TODAY).settings.focusMinutes).toBe(33);
}
