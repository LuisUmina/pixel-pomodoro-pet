import { formatClock, phaseLabel } from "../core/format";
import { progress } from "../core/pomodoro";
import type { PomodoroSettings, PomodoroState, TimerStatus } from "../core/types";
import type { PetState } from "../sprites/duck";
import type { Theme } from "../sprites/themes";
import { ClockCanvas } from "./clock-canvas";
import { PetCanvas } from "./pet-canvas";

export interface WidgetActions {
  toggle(): void;
  skip(): void;
  reset(): void;
  setTask(task: string): void;
  cycleTheme(): void;
  toggleSound(): void;
  toggleGhost(): void;
  hide(): void;
}

export interface WidgetModel {
  readonly state: PomodoroState;
  readonly settings: PomodoroSettings;
  readonly theme: Theme;
  readonly petState: PetState;
  readonly soundEnabled: boolean;
  readonly ghost: boolean;
}

const TOGGLE_LABELS: Readonly<Record<TimerStatus, string>> = {
  idle: "START",
  running: "PAUSE",
  paused: "RESUME",
};

/** Owns the DOM. Everything it needs arrives through {@link WidgetModel}. */
export class Widget {
  readonly frame: HTMLElement;

  readonly #widget: HTMLElement;
  readonly #pet: PetCanvas;
  readonly #clock: ClockCanvas;
  readonly #path: HTMLElement;
  readonly #phase: HTMLElement;
  readonly #progress: HTMLElement;
  readonly #toggle: HTMLElement;
  readonly #task: HTMLInputElement;
  readonly #rounds: HTMLElement;
  readonly #tally: HTMLElement;
  readonly #soundButton: HTMLElement;
  readonly #ghostButton: HTMLElement;

  #roundsSignature = "";

  constructor(actions: WidgetActions) {
    this.frame = required("frame");
    this.#widget = required("widget");
    this.#pet = new PetCanvas(required<HTMLCanvasElement>("pet"));
    this.#clock = new ClockCanvas(required<HTMLCanvasElement>("clock"));
    this.#path = required("path");
    this.#phase = required("phase");
    this.#progress = required("progress");
    this.#toggle = required("toggle");
    this.#task = required<HTMLInputElement>("task");
    this.#rounds = required("rounds");
    this.#tally = required("tally");

    const handlers: Readonly<Record<string, () => void>> = {
      toggle: actions.toggle,
      skip: actions.skip,
      reset: actions.reset,
      theme: actions.cycleTheme,
      sound: actions.toggleSound,
      ghost: actions.toggleGhost,
      hide: actions.hide,
    };

    const buttons = document.querySelectorAll<HTMLElement>("[data-action]");
    for (const button of buttons) {
      const handler = handlers[button.dataset["action"] ?? ""];
      if (handler) {
        button.addEventListener("click", handler);
      }
    }

    this.#soundButton = requireAction("sound");
    this.#ghostButton = requireAction("ghost");

    this.#task.addEventListener("input", () => actions.setTask(this.#task.value));
    // Enter should hand focus back rather than submit anything.
    this.#task.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.#task.blur();
      }
    });
  }

  start(): void {
    this.#pet.start();
  }

  render(model: WidgetModel): void {
    const { state, settings, theme } = model;
    const accent = phaseColor(theme, state);

    this.#widget.dataset["phase"] = state.phase;
    this.#widget.dataset["status"] = state.status;
    this.#path.textContent = `~/${phaseLabel(state.phase).replace(" ", "-")}`;

    this.#clock.render(formatClock(state.remainingMs), accent);
    this.#phase.textContent = `${phaseLabel(state.phase)} · ${state.round}/${settings.roundsPerCycle}`;
    this.#progress.style.width = `${(progress(state) * 100).toFixed(1)}%`;
    this.#toggle.textContent = TOGGLE_LABELS[state.status];

    // Writing unconditionally would fight the caret while the user types.
    if (this.#task.value !== state.task) {
      this.#task.value = state.task;
    }

    this.#renderRounds(state.round, settings.roundsPerCycle);
    this.#tally.textContent = `${state.completedToday} today`;

    this.#soundButton.setAttribute("aria-pressed", String(model.soundEnabled));
    this.#ghostButton.setAttribute("aria-pressed", String(model.ghost));

    this.#pet.setPalette(theme.sprite);
    this.#pet.setState(model.petState);
  }

  #renderRounds(done: number, total: number): void {
    const signature = `${done}/${total}`;
    if (signature === this.#roundsSignature) {
      return;
    }
    this.#roundsSignature = signature;

    this.#rounds.replaceChildren(
      ...Array.from({ length: total }, (_, index) => {
        const dot = document.createElement("i");
        dot.className = index < done ? "round-dot round-dot--done" : "round-dot";
        return dot;
      }),
    );
  }
}

function phaseColor(theme: Theme, state: PomodoroState): string {
  const key = state.phase === "focus" ? "--phase-focus" : "--phase-rest";
  return theme.css[key] ?? "#ffffff";
}

function required<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`index.html is missing #${id}`);
  }

  return element as T;
}

function requireAction(action: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-action="${action}"]`);
  if (!element) {
    throw new Error(`index.html is missing [data-action="${action}"]`);
  }

  return element;
}
