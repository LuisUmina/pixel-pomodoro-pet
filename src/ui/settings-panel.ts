import { DEFAULT_SETTINGS } from "../core/pomodoro";
import { QUIET_PRESETS, formatQuiet } from "../core/quiet";
import type { Phase, PomodoroSettings } from "../core/types";
import { REMINDER_PACKS } from "../messages/reminders";
import { VOICES, type Voice } from "../messages/types";
import { UI_SCALE_PRESETS, formatScale } from "../scale";
import { CHARACTERS } from "../sprites/characters";
import { element } from "./dom";

export interface SettingsPanelActions {
  changeSettings(settings: PomodoroSettings): void;
  changeScale(scale: number): void;
  changeVoice(voice: Voice): void;
  changeReminder(id: string, enabled: boolean): void;
  /** Minutes of silence from now; 0 turns it back off. */
  changeQuiet(minutes: number): void;
  changeCharacter(id: string): void;
  /** Everything this panel controls, not just the durations. */
  restoreDefaults(): void;
}

export interface SettingsModel {
  readonly settings: PomodoroSettings;
  readonly uiScale: number;
  readonly voice: Voice;
  readonly reminders: Readonly<Record<string, boolean>>;
  readonly quietMinutesLeft: number;
  readonly characterId: string;
}

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 12;

const VOICE_LABELS: Readonly<Record<Voice, string>> = {
  dev: "DEV",
  hype: "HYPE",
  plain: "PLAIN",
  off: "OFF",
};

const VOICE_HINTS: Readonly<Record<Voice, string>> = {
  dev: "Dry developer humour",
  hype: "Encouraging",
  plain: "Just the facts",
  // Reminders ride on the same bubble, so OFF has to take them with it —
  // anything else makes the label a lie. PLAIN is the useful-but-quiet one.
  off: "Nothing at all, reminders included",
};

const PHASE_WORDS: Readonly<Record<Phase, string>> = {
  focus: "focus",
  shortBreak: "breaks",
  longBreak: "breaks",
};

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
  readonly #voices: HTMLElement;
  readonly #reminders: HTMLElement;
  readonly #quiet: HTMLElement;
  readonly #pets: HTMLElement;

  readonly #sizeButtons = new Map<number, HTMLButtonElement>();
  readonly #voiceButtons = new Map<Voice, HTMLButtonElement>();
  readonly #reminderBoxes = new Map<string, HTMLInputElement>();
  readonly #quietButtons = new Map<number, HTMLButtonElement>();
  readonly #petButtons = new Map<string, HTMLButtonElement>();

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
    this.#voices = element("set-voice");
    this.#reminders = element("set-reminders");
    this.#quiet = element("set-quiet");
    this.#pets = element("set-pet");

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
    this.#buildVoiceButtons();
    this.#buildReminderRows();
    this.#buildQuietButtons();
    this.#buildPetButtons();
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
    this.actions.restoreDefaults();
  }

  render(model: SettingsModel): void {
    this.#settings = model.settings;
    this.#scale = model.uiScale;
    this.#writeSettings();

    for (const [preset, button] of this.#sizeButtons) {
      button.setAttribute("aria-pressed", String(Math.abs(preset - model.uiScale) < 0.005));
    }

    for (const [candidate, button] of this.#voiceButtons) {
      button.setAttribute("aria-pressed", String(candidate === model.voice));
    }

    for (const [id, box] of this.#reminderBoxes) {
      box.checked = model.reminders[id] === true;
      // Reminders arrive by the same bubble, so a silenced mascot delivers
      // none of them; saying so beats letting the switches look live.
      box.disabled = model.voice === "off";
    }

    const active = activeQuietPreset(model.quietMinutesLeft);
    for (const [preset, button] of this.#quietButtons) {
      button.setAttribute("aria-pressed", String(preset === active));
    }

    for (const [id, button] of this.#petButtons) {
      button.setAttribute("aria-pressed", String(id === model.characterId));
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
      const button = chip(formatScale(preset), () => this.actions.changeScale(preset));
      button.setAttribute("aria-pressed", String(preset === this.#scale));

      this.#sizeButtons.set(preset, button);
      this.#sizes.append(button);
    }
  }

  #buildVoiceButtons(): void {
    for (const voice of VOICES) {
      const button = chip(VOICE_LABELS[voice], () => this.actions.changeVoice(voice));
      button.title = VOICE_HINTS[voice];

      this.#voiceButtons.set(voice, button);
      this.#voices.append(button);
    }
  }

  #buildReminderRows(): void {
    for (const pack of REMINDER_PACKS) {
      const row = document.createElement("label");
      row.className = "reminder";
      row.title = pack.hint;

      const box = document.createElement("input");
      box.type = "checkbox";
      box.addEventListener("change", () =>
        this.actions.changeReminder(pack.id, box.checked),
      );

      const label = document.createElement("span");
      label.className = "reminder__label";
      label.textContent = pack.label;

      const when = document.createElement("span");
      when.className = "reminder__when";
      when.textContent = `${pack.everyMinutes}m · ${phaseWord(pack.phases)}`;

      row.append(box, label, when);
      this.#reminderBoxes.set(pack.id, box);
      this.#reminders.append(row);
    }
  }

  #buildQuietButtons(): void {
    for (const preset of QUIET_PRESETS) {
      const label = preset === 0 ? "OFF" : formatQuiet(preset);
      const button = chip(label, () => this.actions.changeQuiet(preset));

      this.#quietButtons.set(preset, button);
      this.#quiet.append(button);
    }
  }

  #buildPetButtons(): void {
    for (const character of CHARACTERS) {
      const button = chip(character.label, () => this.actions.changeCharacter(character.id));
      button.title = character.hint;

      this.#petButtons.set(character.id, button);
      this.#pets.append(button);
    }
  }
}

/** Packs anchored to both breaks read as one word, not two. */
function phaseWord(phases: readonly Phase[]): string {
  return [...new Set(phases.map((phase) => PHASE_WORDS[phase]))].join(" + ");
}

/**
 * Which chip a running countdown belongs to: the shortest preset that could
 * still be holding it. The chosen length is not stored, and it does not need
 * to be — the remaining time is on the title bar, and the chips stay a stable
 * set of choices rather than a clock that rewrites itself.
 */
function activeQuietPreset(minutesLeft: number): number {
  if (minutesLeft <= 0) {
    return 0;
  }

  const longest = QUIET_PRESETS[QUIET_PRESETS.length - 1] ?? 0;
  return QUIET_PRESETS.find((preset) => preset > 0 && preset >= minutesLeft) ?? longest;
}

function chip(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", onClick);

  return button;
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
