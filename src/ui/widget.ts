import { formatClock, phaseLabel } from "../core/format";
import { progress } from "../core/pomodoro";
import type { PomodoroSettings, PomodoroState, TimerStatus } from "../core/types";
import type { Voice } from "../messages/types";
import type { PetState } from "../sprites/duck";
import type { Theme } from "../sprites/themes";
import { Bubble } from "./bubble";
import { ClockCanvas } from "./clock-canvas";
import { actionElement, element } from "./dom";
import { PetCanvas } from "./pet-canvas";
import { ResizeGrip } from "./resize-grip";
import { SettingsPanel } from "./settings-panel";

export interface WidgetActions {
  toggle(): void;
  skip(): void;
  reset(): void;
  setTask(task: string): void;
  cycleTheme(): void;
  toggleSound(): void;
  toggleGhost(): void;
  hide(): void;
  changeSettings(settings: PomodoroSettings): void;
  /** `persist` is false while a resize drag is still in flight. */
  changeScale(scale: number, persist: boolean): void;
  changeVoice(voice: Voice): void;
}

export interface WidgetModel {
  readonly state: PomodoroState;
  readonly settings: PomodoroSettings;
  readonly theme: Theme;
  readonly petState: PetState;
  readonly soundEnabled: boolean;
  readonly ghost: boolean;
  readonly uiScale: number;
  readonly voice: Voice;
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
  readonly #stage: HTMLElement;
  readonly #pet: PetCanvas;
  readonly #clock: ClockCanvas;
  readonly #bubble: Bubble;
  readonly #settings: SettingsPanel;
  readonly #grip: ResizeGrip;
  readonly #path: HTMLElement;
  readonly #phase: HTMLElement;
  readonly #progress: HTMLElement;
  readonly #toggle: HTMLElement;
  readonly #task: HTMLInputElement;
  readonly #rounds: HTMLElement;
  readonly #tally: HTMLElement;
  readonly #soundButton: HTMLElement;
  readonly #ghostButton: HTMLElement;
  readonly #settingsButton: HTMLElement;

  #roundsSignature = "";
  /** Last rendered model, so opening the panel can fill it in immediately. */
  #model: WidgetModel | null = null;

  constructor(actions: WidgetActions) {
    this.frame = element("frame");
    this.#widget = element("widget");
    this.#stage = element("stage");
    this.#pet = new PetCanvas(element<HTMLCanvasElement>("pet"));
    this.#clock = new ClockCanvas(element<HTMLCanvasElement>("clock"));
    this.#path = element("path");
    this.#phase = element("phase");
    this.#progress = element("progress");
    this.#toggle = element("toggle");
    this.#task = element<HTMLInputElement>("task");
    this.#rounds = element("rounds");
    this.#tally = element("tally");

    this.#bubble = new Bubble(element("bubble"), element("bubble-text"), {
      // The mascot steps aside for its own speech instead of wearing it.
      onChange: (visible) => {
        this.#stage.dataset["speaking"] = String(visible);
      },
    });

    this.#settings = new SettingsPanel({
      changeSettings: (settings) => actions.changeSettings(settings),
      changeScale: (scale) => actions.changeScale(scale, true),
      changeVoice: (voice) => actions.changeVoice(voice),
    });

    this.#grip = new ResizeGrip(
      element("grip"),
      (scale) => actions.changeScale(scale, false),
      (scale) => actions.changeScale(scale, true),
    );

    const handlers: Readonly<Record<string, () => void>> = {
      toggle: actions.toggle,
      skip: actions.skip,
      reset: actions.reset,
      theme: actions.cycleTheme,
      sound: actions.toggleSound,
      ghost: actions.toggleGhost,
      hide: actions.hide,
      settings: () => this.#toggleSettings(),
      defaults: () => this.#settings.restoreDefaults(),
    };

    for (const button of document.querySelectorAll<HTMLElement>("[data-action]")) {
      const handler = handlers[button.dataset["action"] ?? ""];
      if (handler) {
        button.addEventListener("click", handler);
      }
    }

    this.#soundButton = actionElement("sound");
    this.#ghostButton = actionElement("ghost");
    this.#settingsButton = actionElement("settings");

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

  /** Puts a line in the mascot's mouth. Choosing it is the caller's job. */
  say(message: string): void {
    this.#bubble.say(message);
  }

  hush(): void {
    this.#bubble.dismiss();
  }

  render(model: WidgetModel): void {
    const { state, settings, theme } = model;
    const accent = phaseColor(theme, state);
    this.#model = model;

    this.#widget.dataset["phase"] = state.phase;
    this.#widget.dataset["status"] = state.status;
    // Click-through leaves no other trace on screen, and the widget cannot be
    // clicked to ask, so the title bar has to say it outright.
    const path = `~/${phaseLabel(state.phase).replace(" ", "-")}`;
    this.#path.textContent = model.ghost ? `${path} [ghost]` : path;

    this.#clock.setResolution(model.uiScale);
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
    this.frame.dataset["ghost"] = String(model.ghost);
    this.#widget.dataset["ghost"] = String(model.ghost);

    this.#pet.setResolution(model.uiScale);
    this.#pet.setPalette(theme.sprite);
    this.#pet.setState(model.petState);

    this.#grip.setScale(model.uiScale);

    // Only while visible: the panel writes into its inputs, and there is no
    // reason to do that four times a second behind a closed panel.
    if (this.#settings.isOpen) {
      this.#settings.render(settings, model.uiScale, model.voice);
    }
  }

  #toggleSettings(): void {
    this.#settings.toggle();
    this.#settingsButton.setAttribute("aria-pressed", String(this.#settings.isOpen));

    // An idle timer produces no renders, so seed the fields on open.
    if (this.#settings.isOpen && this.#model) {
      this.#settings.render(this.#model.settings, this.#model.uiScale, this.#model.voice);
    }
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
