import type { Task } from "../core/tasks";
import { element } from "./dom";
import type { TasksModel } from "./tasks-panel";

export interface MiniChecklistActions {
  toggleDone(id: string): void;
}

/**
 * Same reordering race {@link TasksPanel} already guards against: ticking a
 * box sinks that row to the bottom, so a second click aimed at the row that
 * used to be there can land on whatever slid up underneath.
 */
const ACTION_GUARD_MS = 350;

/**
 * The read-only sibling of {@link TasksPanel} that floats under the mascot
 * in mini mode. Same rows off the same `TasksModel`, no add form -- ticking
 * a box is the only action this view offers.
 */
export class MiniChecklist {
  readonly #root: HTMLElement;

  #lastActionAt = 0;

  constructor(private readonly actions: MiniChecklistActions) {
    this.#root = element("mini-checklist");
  }

  get visible(): boolean {
    return !this.#root.hidden;
  }

  set visible(value: boolean) {
    this.#root.hidden = !value;
  }

  render(model: TasksModel): void {
    // Same ordering as the full panel: done work sinks to the bottom rather
    // than disappearing, so today's progress stays visible in the glance.
    const ordered = [...model.tasks].sort((a, b) => Number(a.done) - Number(b.done));
    this.#root.replaceChildren(...ordered.map((task) => this.#row(task, model.activeId)));
  }

  #row(task: Task, activeId: string | null): HTMLElement {
    const row = document.createElement("div");
    row.className = "task-item";
    row.dataset["active"] = String(task.id === activeId);
    row.dataset["done"] = String(task.done);

    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "task-item__done";
    box.checked = task.done;
    box.title = "Done";
    box.addEventListener("change", () => {
      // The native checkbox has already flipped its own `checked` the moment
      // this fires. A guarded (dropped) action must undo that, or a rapid
      // second click shows a state that was never actually saved until the
      // next unrelated refresh happens to overwrite it back.
      if (!this.#guardedAction(() => this.actions.toggleDone(task.id))) {
        box.checked = task.done;
      }
    });

    const text = document.createElement("span");
    text.className = "task-item__text";
    text.textContent = task.text === "" ? "(untitled)" : task.text;
    text.title = text.textContent;

    row.append(box, text);
    return row;
  }

  /** Returns whether `run` actually fired, so a rejected checkbox click can be undone. */
  #guardedAction(run: () => void): boolean {
    const now = Date.now();
    if (now - this.#lastActionAt < ACTION_GUARD_MS) {
      return false;
    }

    this.#lastActionAt = now;
    run();
    return true;
  }
}
