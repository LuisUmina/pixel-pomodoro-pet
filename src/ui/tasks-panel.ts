import { MAX_ESTIMATE, type Task } from "../core/tasks";
import { element } from "./dom";

export interface TasksPanelActions {
  addTask(text: string, estimatePomodoros: number): void;
  setActive(id: string): void;
  toggleDone(id: string): void;
  removeTask(id: string): void;
}

export interface TasksModel {
  readonly tasks: readonly Task[];
  readonly activeId: string | null;
}

/**
 * A row action re-renders the whole list, and a done task sinks to the
 * bottom -- so the second click of a real double-click, arriving a beat
 * later at the same screen position, can land on whichever row slid in
 * underneath instead of the one that was actually clicked. Comfortably
 * longer than a double-click's own interval, short enough that two clicks
 * meant for two different rows never feel swallowed.
 */
const ACTION_GUARD_MS = 350;

/**
 * The checklist behind the task field. Unlike the field itself, this is
 * where a *second* task gets created -- typing in the field only ever
 * renames whichever one is already active.
 */
export class TasksPanel {
  readonly #root: HTMLElement;
  readonly #list: HTMLElement;
  readonly #newText: HTMLInputElement;
  readonly #newEstimate: HTMLInputElement;

  #lastActionAt = 0;

  constructor(private readonly actions: TasksPanelActions) {
    this.#root = element("tasks");
    this.#list = element("task-list");
    this.#newText = element<HTMLInputElement>("task-new-text");
    this.#newEstimate = element<HTMLInputElement>("task-new-estimate");

    element("task-add-btn").addEventListener("click", () => this.#submitNew());
    this.#newText.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.#submitNew();
      }
    });
  }

  get isOpen(): boolean {
    return !this.#root.hidden;
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.#root.hidden = false;
  }

  close(): void {
    this.#root.hidden = true;
  }

  render(model: TasksModel): void {
    // Done tasks sink to the bottom rather than disappearing -- today's
    // progress stays visible, just out of the way of what's still open.
    const ordered = [...model.tasks].sort((a, b) => Number(a.done) - Number(b.done));

    this.#list.replaceChildren(...ordered.map((task) => this.#row(task, model.activeId)));
  }

  #row(task: Task, activeId: string | null): HTMLElement {
    const row = document.createElement("div");
    // Named `task-item`, not `task-row`: that name already belongs to the
    // static wrapper around the main task field and its list-toggle button.
    row.className = "task-item";
    row.dataset["active"] = String(task.id === activeId);
    row.dataset["done"] = String(task.done);

    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "task-item__done";
    box.checked = task.done;
    box.title = "Done";
    // Otherwise the row's own click, right behind it, would also fire and
    // fight over whether this task ends up active or not.
    box.addEventListener("click", (event) => event.stopPropagation());
    box.addEventListener("change", () => this.#guardedAction(() => this.actions.toggleDone(task.id)));

    const text = document.createElement("span");
    text.className = "task-item__text";
    text.textContent = task.text === "" ? "(untitled)" : task.text;

    const count = document.createElement("span");
    count.className = "task-item__count";
    count.textContent = formatCount(task);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "task-item__remove";
    remove.title = "Delete";
    remove.textContent = "✕";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      this.#guardedAction(() => this.actions.removeTask(task.id));
    });

    row.append(box, text, count, remove);

    // A done task needs its box unchecked first -- a stray click landing on
    // finished work should not silently put it back in play.
    if (!task.done) {
      row.addEventListener("click", () => this.#guardedAction(() => this.actions.setActive(task.id)));
    }

    return row;
  }

  #guardedAction(run: () => void): void {
    const now = Date.now();
    if (now - this.#lastActionAt < ACTION_GUARD_MS) {
      return;
    }

    this.#lastActionAt = now;
    run();
  }

  #submitNew(): void {
    const text = this.#newText.value.trim();
    if (text === "") {
      return;
    }

    const estimate = this.#newEstimate.valueAsNumber;
    this.actions.addTask(text, Number.isFinite(estimate) ? estimate : 0);

    this.#newText.value = "";
    this.#newEstimate.value = "";
    this.#newText.focus();
  }
}

function formatCount(task: Task): string {
  const estimate = Math.min(task.estimatePomodoros, MAX_ESTIMATE);
  return estimate > 0
    ? `${task.completedPomodoros}/${estimate} 🍅`
    : `${task.completedPomodoros} 🍅`;
}
