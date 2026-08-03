import { formatClock, phaseLabel } from "../core/format";
import { progress } from "../core/pomodoro";
import { formatQuiet } from "../core/quiet";
import type { PomodoroSettings, PomodoroState, TimerStatus } from "../core/types";
import type { Voice } from "../messages/types";
import { getCharacter, type PetState } from "../sprites/characters";
import type { ShortcutMap } from "../core/shortcuts";
import type { Theme } from "../sprites/themes";
import { Bubble } from "./bubble";
import { ClockCanvas } from "./clock-canvas";
import { actionElement, element } from "./dom";
import { HistoryPanel, type HistoryModel } from "./history-panel";
import { MiniChecklist } from "./mini-checklist";
import { PetCanvas } from "./pet-canvas";
import { ResizeGrip } from "./resize-grip";
import { SettingsPanel } from "./settings-panel";
import { TasksPanel, type TasksModel } from "./tasks-panel";

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
  changeReminder(id: string, enabled: boolean): void;
  changeShortcuts(shortcuts: ShortcutMap): Promise<{ success: boolean; error?: string }>;
  changeQuiet(minutes: number): void;
  changeCharacter(id: string): void;
  changeMiniMode(enabled: boolean): void;
  /** Floating checklist under the mascot; only visible while mini mode is on. */
  changeTaskChecklist(enabled: boolean): void;
  /** Opacity while auto-faded; 0 turns auto-fade off. */
  changeDimOpacity(value: number): void;
  /** Pomodoros that make a good day; 0 turns the goal off. */
  changeDailyGoal(value: number): void;
  addTask(text: string, estimatePomodoros: number): void;
  setActiveTask(id: string): void;
  toggleTaskDone(id: string): void;
  removeTask(id: string): void;
  restoreDefaults(): void;
  /** Fired only when the history panel opens — closing needs no fresh data. */
  viewHistory(): HistoryModel;
  /**
   * Read fresh on open and on every refresh, never cached in
   * {@link WidgetModel} -- unlike everything else there, this can change out
   * from under a render that already happened (a pomodoro attributing to a
   * task while the panel sits open), so a stale copy is exactly the bug to
   * avoid.
   */
  viewTasks(): TasksModel;
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
  readonly reminders: Readonly<Record<string, boolean>>;
  readonly shortcuts: ShortcutMap;
  /** 0 when the mascot is not under a vow of silence. */
  readonly quietMinutesLeft: number;
  readonly characterId: string;
  readonly miniMode: boolean;
  /** Floating checklist under the mascot; only shown while `miniMode` is on. */
  readonly taskChecklist: boolean;
  /** Opacity while auto-faded; 0 means auto-fade is off. */
  readonly dimOpacity: number;
  /** Pomodoros that make a good day; 0 means no goal is set. */
  readonly dailyGoal: number;
}

export interface FrameSize {
  readonly width: number;
  readonly height: number;
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
  readonly #history: HistoryPanel;
  readonly #tasksPanel: TasksPanel;
  readonly #miniChecklist: MiniChecklist;
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
  readonly #miniButton: HTMLElement;
  readonly #tasksButton: HTMLElement;
  readonly #checklistButton: HTMLElement;
  readonly #viewHistory: () => HistoryModel;
  readonly #viewTasks: () => TasksModel;

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
      changeReminder: (id, enabled) => actions.changeReminder(id, enabled),
      changeShortcuts: (shortcuts) => actions.changeShortcuts(shortcuts),
      changeQuiet: (minutes) => actions.changeQuiet(minutes),
      changeCharacter: (id) => actions.changeCharacter(id),
      changeMiniMode: (enabled) => actions.changeMiniMode(enabled),
      changeDimOpacity: (value) => actions.changeDimOpacity(value),
      changeDailyGoal: (value) => actions.changeDailyGoal(value),
      restoreDefaults: () => actions.restoreDefaults(),
    });

    this.#history = new HistoryPanel();
    this.#viewHistory = actions.viewHistory;

    this.#tasksPanel = new TasksPanel({
      addTask: (text, estimatePomodoros) => actions.addTask(text, estimatePomodoros),
      setActive: (id) => actions.setActiveTask(id),
      toggleDone: (id) => actions.toggleTaskDone(id),
      removeTask: (id) => actions.removeTask(id),
    });
    this.#viewTasks = actions.viewTasks;

    this.#miniChecklist = new MiniChecklist({
      toggleDone: (id) => actions.toggleTaskDone(id),
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
      history: () => this.#toggleHistory(),
      mini: () => actions.changeMiniMode(!(this.#model?.miniMode ?? false)),
      tasks: () => this.#toggleTasks(),
      checklist: () => actions.changeTaskChecklist(!(this.#model?.taskChecklist ?? false)),
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
    this.#miniButton = actionElement("mini");
    this.#tasksButton = actionElement("tasks");
    this.#checklistButton = actionElement("checklist");

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
    // Click-through and a vow of silence leave no other trace on screen, and
    // a ghosted widget cannot be clicked to ask, so the title bar says both.
    this.#path.textContent = titlePath(state, model);

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
    this.#tally.textContent =
      model.dailyGoal > 0
        ? `${state.completedToday}/${model.dailyGoal} today`
        : `${state.completedToday} today`;

    this.#soundButton.setAttribute("aria-pressed", String(model.soundEnabled));
    this.#ghostButton.setAttribute("aria-pressed", String(model.ghost));
    this.#miniButton.setAttribute("aria-pressed", String(model.miniMode));
    this.#checklistButton.setAttribute("aria-pressed", String(model.taskChecklist));
    this.frame.dataset["ghost"] = String(model.ghost);
    this.#widget.dataset["ghost"] = String(model.ghost);
    this.frame.dataset["mini"] = String(model.miniMode);
    this.#widget.dataset["mini"] = String(model.miniMode);

    // Only rebuilds the rows on an actual show/hide transition, the same
    // reasoning as settings/history/tasks below -- not on every one of these
    // calls, which run four times a second while a session is ticking.
    const showChecklist = model.miniMode && model.taskChecklist;
    if (showChecklist !== this.#miniChecklist.visible) {
      this.#miniChecklist.visible = showChecklist;
      if (showChecklist) {
        this.#miniChecklist.render(this.#viewTasks());
      }
    }

    this.#pet.setCharacter(getCharacter(model.characterId));
    this.#pet.setResolution(model.uiScale);
    this.#pet.setPalette(theme.sprite);
    this.#pet.setState(model.petState);

    this.#grip.setScale(model.uiScale);

    // Only while visible: the panel writes into its inputs, and there is no
    // reason to do that four times a second behind a closed panel.
    if (this.#settings.isOpen) {
      this.#settings.render(model);
    }
  }

  #toggleSettings(): void {
    this.#settings.toggle();
    this.#settingsButton.setAttribute("aria-pressed", String(this.#settings.isOpen));

    // An idle timer produces no renders, so seed the fields on open.
    if (this.#settings.isOpen && this.#model) {
      this.#settings.render(this.#model);
    }
  }

  /**
   * The heatmap has no place else it needs to live, so it is computed here
   * on open rather than kept current in every {@link WidgetModel} — the
   * same reasoning as settings, just pushed one step further since nothing
   * about history is otherwise needed on the four-times-a-second render path.
   */
  #toggleHistory(): void {
    this.#history.toggle();
    this.#tally.setAttribute("aria-pressed", String(this.#history.isOpen));

    if (this.#history.isOpen) {
      this.#history.render(this.#viewHistory());
    }
  }

  /** Keeps an already-open history panel current when a session lands. */
  refreshHistory(): void {
    if (this.#history.isOpen) {
      this.#history.render(this.#viewHistory());
    }
  }

  #toggleTasks(): void {
    this.#tasksPanel.toggle();
    this.#tasksButton.setAttribute("aria-pressed", String(this.#tasksPanel.isOpen));

    if (this.#tasksPanel.isOpen) {
      this.#tasksPanel.render(this.#viewTasks());
    }
  }

  /**
   * Keeps an already-open task list current when a pomodoro lands on it --
   * both the full panel and the mini-mode checklist, whichever is showing,
   * so an action taken in one is never stale in the other.
   */
  refreshTasks(): void {
    if (this.#tasksPanel.isOpen) {
      this.#tasksPanel.render(this.#viewTasks());
    }

    if (this.#miniChecklist.visible) {
      this.#miniChecklist.render(this.#viewTasks());
    }
  }

  /**
   * Mini mode has no room for a panel and no titlebar button to reach one
   * from, but a panel opened beforehand can still be sitting open when a
   * shortcut or the tray flips the mode — so entering mini mode forces every
   * panel shut rather than leaving one squashed into the tiny frame
   * underneath the mini titlebar's higher stacking order.
   */
  closePanels(): void {
    if (this.#settings.isOpen) {
      this.#settings.close();
      this.#settingsButton.setAttribute("aria-pressed", "false");
    }

    if (this.#history.isOpen) {
      this.#history.close();
      this.#tally.setAttribute("aria-pressed", "false");
    }

    if (this.#tasksPanel.isOpen) {
      this.#tasksPanel.close();
      this.#tasksButton.setAttribute("aria-pressed", "false");
    }
  }

  /**
   * The frame's own rendered footprint, in CSS pixels — which line up with
   * Tauri's "logical" size units the same way `BASE_WIDGET_WIDTH` already
   * does elsewhere. Reading it forces a layout pass, so this only ever
   * returns the size for whatever `render()` last put on screen, never a
   * stale one left over from before a mode switch.
   */
  measureFrame(): FrameSize {
    const rect = this.frame.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
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

function titlePath(state: PomodoroState, model: WidgetModel): string {
  const markers = [
    model.ghost ? "ghost" : "",
    model.quietMinutesLeft > 0 ? `quiet ${formatQuiet(model.quietMinutesLeft)}` : "",
  ].filter(Boolean);

  const path = `~/${phaseLabel(state.phase).replace(" ", "-")}`;
  return markers.length > 0 ? `${path} [${markers.join(" · ")}]` : path;
}

function phaseColor(theme: Theme, state: PomodoroState): string {
  const key = state.phase === "focus" ? "--phase-focus" : "--phase-rest";
  return theme.css[key] ?? "#ffffff";
}
