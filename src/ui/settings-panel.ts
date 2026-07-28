import { DEFAULT_SETTINGS } from "../core/pomodoro";
import type { PomodoroSettings } from "../core/types";
import { UI_SCALE_PRESETS, formatScale } from "../scale";
import { element } from "./dom";

export interface SettingsPanelActions {
  changeSettings(settings: PomodoroSettings): void;
  changeScale(scale: number): void;
}

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 12;

/** The durations and widget size, behind the gear button. */
export class SettingsPanel {
  readonly #root: HTMLElement;
  readonly #focus: HTMLInputElement;
  readonly #shortBreak: HTMLInputElement;
  readonly #longBreak: HTMLInputElement;
  readonly #rounds: HTMLInputElement;
  readonly #autoBreaks: HTMLInputElement;
  readonly #autoFocus: HTMLInputElement;
  readonly #sizes: HTMLElement;

  readonly #sizeButtons = new Map<number, HTMLButtonElement>();

  #settings: PomodoroSettings = DEFAULT_SETTINGS;
  #scale = 1;

  constructor(private readonly actions: SettingsPanelActions) {
    this.#root = element("settings");
    this.#focus = element<HTMLInputElement>("set-focus");
    this.#shortBreak = element<HTMLInputElement>("set-short");
    this.#longBreak = element<HTMLInputElement>("set-long");
    this.#rounds = element<HTMLInputElement>("set-rounds");
    this.#autoBreaks = element<HTMLInputElement>("set-auto-breaks");
    this.#autoFocus = element<HTMLInputElement>("set-auto-focus");
    this.#sizes = element("set-sizes");

    for (const input of this.#numberInputs()) {
      // `input` reacts as you type but leaves the field alone; `change` fires
      // on blur, which is the right moment to normalise what was typed.
      input.addEventListener("input", () => this.#emit());
      input.addEventListener("change", () => {
        this.#emit();
        this.#writeSettings();
      });
    }

    for (const toggle of [this.#autoBreaks, this.#autoFocus]) {
      toggle.addEventListener("change", () => this.#emit());
    }

    this.#buildSizeButtons();
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

  restoreDefaults(): void {
    this.actions.changeSettings(DEFAULT_SETTINGS);
  }

  render(settings: PomodoroSettings, scale: number): void {
    this.#settings = settings;
    this.#scale = scale;
    this.#writeSettings();

    for (const [preset, button] of this.#sizeButtons) {
      button.setAttribute("aria-pressed", String(Math.abs(preset - scale) < 0.005));
    }
  }

  #numberInputs(): readonly HTMLInputElement[] {
    return [this.#focus, this.#shortBreak, this.#longBreak, this.#rounds];
  }

  /** Pushes the model back into the fields, clamped. */
  #writeSettings(): void {
    write(this.#focus, this.#settings.focusMinutes);
    write(this.#shortBreak, this.#settings.shortBreakMinutes);
    write(this.#longBreak, this.#settings.longBreakMinutes);
    write(this.#rounds, this.#settings.roundsPerCycle);
    this.#autoBreaks.checked = this.#settings.autoStartBreaks;
    this.#autoFocus.checked = this.#settings.autoStartFocus;
  }

  #emit(): void {
    this.actions.changeSettings({
      focusMinutes: read(this.#focus, this.#settings.focusMinutes, MIN_MINUTES, MAX_MINUTES),
      shortBreakMinutes: read(
        this.#shortBreak,
        this.#settings.shortBreakMinutes,
        MIN_MINUTES,
        MAX_MINUTES,
      ),
      longBreakMinutes: read(
        this.#longBreak,
        this.#settings.longBreakMinutes,
        MIN_MINUTES,
        MAX_MINUTES,
      ),
      roundsPerCycle: read(
        this.#rounds,
        this.#settings.roundsPerCycle,
        MIN_ROUNDS,
        MAX_ROUNDS,
      ),
      autoStartBreaks: this.#autoBreaks.checked,
      autoStartFocus: this.#autoFocus.checked,
    });
  }

  #buildSizeButtons(): void {
    for (const preset of UI_SCALE_PRESETS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "size-btn";
      button.textContent = formatScale(preset);
      button.setAttribute("aria-pressed", String(preset === this.#scale));
      button.addEventListener("click", () => this.actions.changeScale(preset));

      this.#sizeButtons.set(preset, button);
      this.#sizes.append(button);
    }
  }
}

/**
 * Never rewrites the field being typed into. Without this, clamping a
 * half-typed value would yank the caret while the user is still going.
 */
function write(input: HTMLInputElement, value: number): void {
  const next = String(value);
  if (document.activeElement !== input && input.value !== next) {
    input.value = next;
  }
}

/** An empty or nonsense field falls back rather than resetting the timer. */
function read(
  input: HTMLInputElement,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = input.valueAsNumber;
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
