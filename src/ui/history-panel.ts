import { heatLevel, type HeatmapCell } from "../core/history";
import { element } from "./dom";

export interface HistoryModel {
  readonly streak: number;
  readonly bestStreak: number;
  readonly totalSessions: number;
  readonly bestDayCount: number;
  readonly bestWeekCount: number;
  readonly cells: readonly HeatmapCell[];
}

/**
 * The streak and heatmap overlay behind the tally. Read-only, so unlike
 * {@link SettingsPanel} it never calls back out — the caller decides when to
 * hand it a fresh {@link HistoryModel}, which is only ever while it is open.
 */
export class HistoryPanel {
  readonly #root: HTMLElement;
  readonly #streak: HTMLElement;
  readonly #bestStreak: HTMLElement;
  readonly #total: HTMLElement;
  readonly #bestWeek: HTMLElement;
  readonly #heatmap: HTMLElement;
  readonly #caption: HTMLElement;

  constructor() {
    this.#root = element("history");
    this.#streak = element("hist-streak");
    this.#bestStreak = element("hist-best-streak");
    this.#total = element("hist-total");
    this.#bestWeek = element("hist-best-week");
    this.#heatmap = element("hist-heatmap");
    this.#caption = element("hist-caption");
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

  render(model: HistoryModel): void {
    this.#streak.textContent = String(model.streak);
    this.#bestStreak.textContent = String(model.bestStreak);
    this.#total.textContent = String(model.totalSessions);
    this.#bestWeek.textContent = String(model.bestWeekCount);
    this.#caption.textContent = caption(model.bestDayCount);

    // Rebuilt in full on every render rather than diffed: this only ever
    // runs when the panel opens or a session lands while it is already
    // open, nothing like the per-tick paths elsewhere that earn a diff.
    this.#heatmap.replaceChildren(
      ...model.cells.map((cell) => {
        const node = document.createElement("i");
        node.className = "heatmap__cell";
        node.dataset["level"] = String(heatLevel(cell.count));
        node.title = `${cell.day} · ${sessions(cell.count)}`;
        return node;
      }),
    );
  }
}

function caption(bestDayCount: number): string {
  return bestDayCount > 0 ? `Best day: ${sessions(bestDayCount)}` : "No sessions logged yet.";
}

function sessions(count: number): string {
  return `${count} session${count === 1 ? "" : "s"}`;
}
