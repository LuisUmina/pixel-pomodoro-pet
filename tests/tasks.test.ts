import { describe, expect, it } from "vitest";

import {
  INITIAL_TASKS,
  MAX_ESTIMATE,
  TASK_TEXT_MAX_LENGTH,
  activeTaskText,
  addTask,
  attributePomodoro,
  removeTask,
  renameActive,
  setActive,
  toggleDone,
  type TasksState,
} from "../src/core/tasks";
import { memoryStore } from "../src/store/persistence";
import { loadTasks, readLegacyTaskText, saveTasks } from "../src/store/tasks";

const TODAY = "2026-08-02";

describe("renameActive", () => {
  it("creates and activates the first task from an empty state", () => {
    const state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);

    expect(state.activeId).toBe("t1");
    expect(state.tasks).toEqual([
      {
        id: "t1",
        text: "fix login bug",
        estimatePomodoros: 0,
        completedPomodoros: 0,
        done: false,
        createdAt: TODAY,
      },
    ]);
  });

  it("does nothing for an empty keystroke with nothing active", () => {
    expect(renameActive(INITIAL_TASKS, "", "t1", TODAY)).toBe(INITIAL_TASKS);
  });

  it("renames the active task instead of creating a second one", () => {
    const first = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    const renamed = renameActive(first, "fix login bug for real", "t2", TODAY);

    expect(renamed.tasks).toHaveLength(1);
    expect(renamed.activeId).toBe("t1");
    expect(renamed.tasks[0]?.text).toBe("fix login bug for real");
  });

  it("renaming down to empty clears the text but keeps the task active", () => {
    const first = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    const cleared = renameActive(first, "", "t2", TODAY);

    expect(cleared.tasks).toHaveLength(1);
    expect(cleared.activeId).toBe("t1");
    expect(cleared.tasks[0]?.text).toBe("");
  });

  it("caps the text length", () => {
    const long = "x".repeat(TASK_TEXT_MAX_LENGTH + 10);
    const state = renameActive(INITIAL_TASKS, long, "t1", TODAY);

    expect(state.tasks[0]?.text).toHaveLength(TASK_TEXT_MAX_LENGTH);
  });
});

describe("addTask", () => {
  it("queues a task without activating it", () => {
    const state = addTask(INITIAL_TASKS, "review PR #42", 3, "t1", TODAY);

    expect(state.activeId).toBeNull();
    expect(state.tasks).toEqual([
      {
        id: "t1",
        text: "review PR #42",
        estimatePomodoros: 3,
        completedPomodoros: 0,
        done: false,
        createdAt: TODAY,
      },
    ]);
  });

  it("ignores a blank task", () => {
    expect(addTask(INITIAL_TASKS, "   ", 0, "t1", TODAY)).toBe(INITIAL_TASKS);
  });

  it("clamps the estimate to a sane range", () => {
    expect(addTask(INITIAL_TASKS, "a", -5, "t1", TODAY).tasks[0]?.estimatePomodoros).toBe(0);
    expect(
      addTask(INITIAL_TASKS, "a", MAX_ESTIMATE + 50, "t1", TODAY).tasks[0]?.estimatePomodoros,
    ).toBe(MAX_ESTIMATE);
  });
});

describe("setActive", () => {
  it("switches the active task by id", () => {
    let state = addTask(INITIAL_TASKS, "one", 0, "t1", TODAY);
    state = addTask(state, "two", 0, "t2", TODAY);

    expect(setActive(state, "t2").activeId).toBe("t2");
  });

  it("ignores an id that does not exist", () => {
    const state = addTask(INITIAL_TASKS, "one", 0, "t1", TODAY);

    expect(setActive(state, "ghost")).toBe(state);
  });

  it("refuses to activate a done task", () => {
    let state = addTask(INITIAL_TASKS, "one", 0, "t1", TODAY);
    state = toggleDone(state, "t1");

    expect(setActive(state, "t1")).toBe(state);
  });
});

describe("toggleDone", () => {
  it("marking the active task done clears activeId", () => {
    const state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    const done = toggleDone(state, "t1");

    expect(done.tasks[0]?.done).toBe(true);
    expect(done.activeId).toBeNull();
  });

  it("marking an inactive task done leaves activeId alone", () => {
    let state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    state = addTask(state, "review PR", 0, "t2", TODAY);
    const done = toggleDone(state, "t2");

    expect(done.activeId).toBe("t1");
  });

  it("un-checking a task does not reactivate it", () => {
    let state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    state = toggleDone(state, "t1");
    state = toggleDone(state, "t1");

    expect(state.tasks[0]?.done).toBe(false);
    expect(state.activeId).toBeNull();
  });
});

describe("removeTask", () => {
  it("clears activeId if the removed task was active", () => {
    const state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    const removed = removeTask(state, "t1");

    expect(removed.tasks).toEqual([]);
    expect(removed.activeId).toBeNull();
  });

  it("leaves activeId alone when removing a different task", () => {
    let state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    state = addTask(state, "review PR", 0, "t2", TODAY);

    expect(removeTask(state, "t2").activeId).toBe("t1");
  });
});

describe("attributePomodoro", () => {
  it("credits the active task", () => {
    const state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    const credited = attributePomodoro(attributePomodoro(state));

    expect(credited.tasks[0]?.completedPomodoros).toBe(2);
  });

  it("is a no-op with nothing active", () => {
    expect(attributePomodoro(INITIAL_TASKS)).toBe(INITIAL_TASKS);
  });
});

describe("activeTaskText", () => {
  it("reads the active task's text", () => {
    const state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    expect(activeTaskText(state)).toBe("fix login bug");
  });

  it("is empty when nothing is active", () => {
    const state: TasksState = INITIAL_TASKS;
    expect(activeTaskText(state)).toBe("");
  });
});

describe("store/tasks", () => {
  it("round-trips through a store", () => {
    const store = memoryStore();
    let state = renameActive(INITIAL_TASKS, "fix login bug", "t1", TODAY);
    state = addTask(state, "review PR", 2, "t2", TODAY);

    saveTasks(store, state);

    expect(loadTasks(store)).toEqual(state);
  });

  it("falls back to the initial state when nothing is stored", () => {
    expect(loadTasks(memoryStore())).toEqual(INITIAL_TASKS);
  });

  it("falls back when the stored value is not an object", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:tasks", "garbage");

    expect(loadTasks(store)).toEqual(INITIAL_TASKS);
  });

  it("drops a task missing an id or text", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:tasks", {
      tasks: [{ id: "t1", text: "fine" }, { text: "no id" }, { id: "t2" }, "garbage"],
      activeId: null,
    });

    expect(loadTasks(store).tasks.map((task) => task.id)).toEqual(["t1"]);
  });

  it("falls back activeId to null when it points at no real task", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:tasks", {
      tasks: [{ id: "t1", text: "fine" }],
      activeId: "ghost",
    });

    expect(loadTasks(store).activeId).toBeNull();
  });

  it("falls back activeId to null when it points at a done task", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:tasks", {
      tasks: [{ id: "t1", text: "fine", done: true }],
      activeId: "t1",
    });

    expect(loadTasks(store).activeId).toBeNull();
  });

  it("clamps a corrupt negative or oversized count", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:tasks", {
      tasks: [
        { id: "t1", text: "a", estimatePomodoros: -5, completedPomodoros: 999 },
        { id: "t2", text: "b", estimatePomodoros: 500 },
      ],
      activeId: null,
    });

    const loaded = loadTasks(store);
    expect(loaded.tasks[0]?.estimatePomodoros).toBe(0);
    expect(loaded.tasks[0]?.completedPomodoros).toBe(999);
    expect(loaded.tasks[1]?.estimatePomodoros).toBe(MAX_ESTIMATE);
  });
});

describe("readLegacyTaskText", () => {
  it("reads the free-text task field from before this store existed", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:preferences", { task: "fix login bug" });

    expect(readLegacyTaskText(store)).toBe("fix login bug");
  });

  it("is empty when there is nothing stored yet", () => {
    expect(readLegacyTaskText(memoryStore())).toBe("");
  });

  it("is empty when the legacy field is missing or malformed", () => {
    const store = memoryStore();
    store.set("pixel-pomodoro-pet:preferences", { task: 123 });

    expect(readLegacyTaskText(store)).toBe("");
  });
});
