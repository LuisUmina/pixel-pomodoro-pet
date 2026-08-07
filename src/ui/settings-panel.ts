import { DEFAULT_SETTINGS } from "../core/pomodoro";
import {
  CUSTOM_REMINDER_MAX_MINUTES,
  CUSTOM_REMINDER_TEXT_MAX_LENGTH,
  type CustomReminder,
} from "../core/reminders";
import { QUIET_PRESETS, formatQuiet } from "../core/quiet";
import type { Phase, PomodoroSettings } from "../core/types";
import { DAILY_GOAL_PRESETS, formatDailyGoal } from "../dailyGoal";
import { DIM_OPACITY_PRESETS, formatDimOpacity } from "../dim";
import { REMINDER_PACKS } from "../messages/reminders";
import { VOICES, type Voice } from "../messages/types";
import { UI_SCALE_PRESETS, formatScale } from "../scale";
import { CHARACTERS } from "../sprites/characters";
import {
  SHORTCUT_DEFINITIONS,
  findShortcutConflicts,
  hasPrimaryKey,
  normalizeShortcut,
  type ShortcutAction,
  type ShortcutMap,
} from "../core/shortcuts";
import { element } from "./dom";

export interface SettingsPanelActions {
  changeSettings(settings: PomodoroSettings): void;
  changeScale(scale: number): void;
  changeVoice(voice: Voice): void;
  changeReminder(id: string, enabled: boolean): void;
  changeCustomReminders(reminders: readonly CustomReminder[]): void;
  changeShortcuts(shortcuts: ShortcutMap): Promise<{ success: boolean; error?: string }>;
  /** Minutes of silence from now; 0 turns it back off. */
  changeQuiet(minutes: number): void;
  changeCharacter(id: string): void;
  changeMiniMode(enabled: boolean): void;
  /** Opacity while auto-faded; 0 turns auto-fade off. */
  changeDimOpacity(value: number): void;
  /** Pomodoros that make a good day; 0 turns the goal off. */
  changeDailyGoal(value: number): void;
  /** Everything this panel controls, not just the durations. */
  restoreDefaults(): void;
  exportData(): void;
  importData(): void;
}

export interface SettingsModel {
  readonly settings: PomodoroSettings;
  readonly uiScale: number;
  readonly voice: Voice;
  readonly reminders: Readonly<Record<string, boolean>>;
  readonly customReminders: readonly CustomReminder[];
  readonly shortcuts: ShortcutMap;
  readonly quietMinutesLeft: number;
  readonly characterId: string;
  readonly miniMode: boolean;
  readonly dimOpacity: number;
  readonly dailyGoal: number;
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
  readonly #mini: HTMLInputElement;
  readonly #sizes: HTMLElement;
  readonly #voices: HTMLElement;
  readonly #reminders: HTMLElement;
  readonly #customReminders: HTMLElement;
  readonly #customReminderScreen: HTMLElement;
  readonly #shortcuts: HTMLElement;
  readonly #shortcutsError: HTMLElement;
  readonly #quiet: HTMLElement;
  readonly #pets: HTMLElement;
  readonly #dims: HTMLElement;
  readonly #goals: HTMLElement;

  readonly #sizeButtons = new Map<number, HTMLButtonElement>();
  readonly #voiceButtons = new Map<Voice, HTMLButtonElement>();
  readonly #reminderBoxes = new Map<string, HTMLInputElement>();
  readonly #shortcutInputs = new Map<ShortcutAction, HTMLInputElement>();
  readonly #quietButtons = new Map<number, HTMLButtonElement>();
  readonly #petButtons = new Map<string, HTMLButtonElement>();
  readonly #dimButtons = new Map<number, HTMLButtonElement>();
  readonly #goalButtons = new Map<number, HTMLButtonElement>();

  #settings: PomodoroSettings = DEFAULT_SETTINGS;
  #scale = 1;
  #lastShortcuts: ShortcutMap | null = null;

  constructor(private readonly actions: SettingsPanelActions) {
    this.#root = element("settings");
    this.#focus = element<HTMLInputElement>("set-focus");
    this.#shortBreak = element<HTMLInputElement>("set-short");
    this.#longBreak = element<HTMLInputElement>("set-long");
    this.#rounds = element<HTMLInputElement>("set-rounds");
    this.#autoBreaks = element<HTMLInputElement>("set-auto-breaks");
    this.#autoFocus = element<HTMLInputElement>("set-auto-focus");
    this.#mini = element<HTMLInputElement>("set-mini");
    this.#sizes = element("set-sizes");
    this.#voices = element("set-voice");
    this.#reminders = element("set-reminders");
    this.#customReminders = element("set-custom-reminders");
    this.#customReminderScreen = element("custom-reminder-screen");
    this.#shortcuts = element("set-shortcuts");
    this.#shortcutsError = element("set-shortcuts-error");
    this.#quiet = element("set-quiet");
    this.#pets = element("set-pet");
    this.#dims = element("set-dim");
    this.#goals = element("set-goal");

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

    this.#mini.addEventListener("change", () =>
      this.actions.changeMiniMode(this.#mini.checked),
    );

    const exportBtn = this.#root.querySelector<HTMLButtonElement>('[data-action="export-data"]');
    exportBtn?.addEventListener("click", () => this.actions.exportData());

    const importBtn = this.#root.querySelector<HTMLButtonElement>('[data-action="import-data"]');
    importBtn?.addEventListener("click", () => this.actions.importData());

    this.#buildSizeButtons();
    this.#buildVoiceButtons();
    this.#buildReminderRows();
    this.#buildCustomReminderEditor();
    this.#buildShortcutRows();
    this.#buildQuietButtons();
    this.#buildPetButtons();
    this.#buildDimButtons();
    this.#buildGoalButtons();
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
    this.#customReminderScreen.hidden = true;
  }

  restoreDefaults(): void {
    this.actions.restoreDefaults();
  }

  render(model: SettingsModel): void {
    this.#settings = model.settings;
    this.#scale = model.uiScale;
    this.#lastShortcuts = model.shortcuts;
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
    this.#renderCustomReminders(model.customReminders, model.voice === "off");

    for (const [id, input] of this.#shortcutInputs) {
      if (document.activeElement !== input) {
        input.value = model.shortcuts[id] ?? "";
        input.classList.remove("shortcut__input--error");
      }
    }
    this.#shortcutsError.hidden = true;

    const active = activeQuietPreset(model.quietMinutesLeft);
    for (const [preset, button] of this.#quietButtons) {
      button.setAttribute("aria-pressed", String(preset === active));
    }

    for (const [id, button] of this.#petButtons) {
      button.setAttribute("aria-pressed", String(id === model.characterId));
    }

    for (const [preset, button] of this.#dimButtons) {
      button.setAttribute("aria-pressed", String(Math.abs(preset - model.dimOpacity) < 0.005));
    }

    for (const [preset, button] of this.#goalButtons) {
      button.setAttribute("aria-pressed", String(preset === model.dailyGoal));
    }

    this.#mini.checked = model.miniMode;
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

  #buildCustomReminderEditor(): void {
    const add = element<HTMLButtonElement>("custom-reminder-add");
    element("custom-reminder-open").addEventListener("click", () => {
      this.#customReminderScreen.hidden = false;
    });
    element("custom-reminder-back").addEventListener("click", () => {
      this.#customReminderScreen.hidden = true;
    });
    add.addEventListener("click", () => {
      const text = element<HTMLInputElement>("custom-reminder-text").value.trim();
      const cadence = element<HTMLInputElement>("custom-reminder-cadence").valueAsNumber;
      const anchor = element<HTMLSelectElement>("custom-reminder-anchor").value;
      if (text === "" || !Number.isFinite(cadence) || (anchor !== "focus" && anchor !== "break")) {
        return;
      }

      const current = this.#customReminders.dataset["value"];
      const reminders = current ? (JSON.parse(current) as CustomReminder[]) : [];
      this.actions.changeCustomReminders([
        ...reminders,
        {
          id: crypto.randomUUID(),
          text: text.slice(0, CUSTOM_REMINDER_TEXT_MAX_LENGTH),
          everyMinutes: Math.min(CUSTOM_REMINDER_MAX_MINUTES, Math.max(1, Math.round(cadence))),
          anchor,
        },
      ]);
      element<HTMLInputElement>("custom-reminder-text").value = "";
    });
  }

  #renderCustomReminders(reminders: readonly CustomReminder[], disabled: boolean): void {
    this.#customReminders.dataset["value"] = JSON.stringify(reminders);
    this.#customReminders.replaceChildren(
      ...reminders.map((reminder) => {
        const row = document.createElement("div");
        row.className = "custom-reminder";

        const text = document.createElement("span");
        text.textContent = reminder.text;
        text.title = reminder.text;

        const detail = document.createElement("span");
        detail.textContent = `${reminder.everyMinutes}m · ${reminder.anchor === "focus" ? "focus" : "descanso"}`;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "custom-reminder__remove";
        remove.textContent = "×";
        remove.title = "Eliminar recordatorio";
        remove.disabled = disabled;
        remove.addEventListener("click", () =>
          this.actions.changeCustomReminders(reminders.filter((item) => item.id !== reminder.id)),
        );
        row.append(text, detail, remove);
        return row;
      }),
    );
  }

  #buildShortcutRows(): void {
    for (const def of SHORTCUT_DEFINITIONS) {
      const row = document.createElement("div");
      row.className = "shortcut-row";

      const label = document.createElement("span");
      label.className = "shortcut__label";
      label.textContent = def.label;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "shortcut__input";
      input.spellcheck = false;
      input.autocomplete = "off";

      input.addEventListener("keydown", (e) => {
        if (e.key === "Tab" || e.key === "Escape") {
          return;
        }
        e.preventDefault();

        const modifiers: string[] = [];
        if (e.ctrlKey) modifiers.push("Ctrl");
        if (e.altKey) modifiers.push("Alt");
        if (e.shiftKey) modifiers.push("Shift");
        if (e.metaKey) modifiers.push("Super");

        let key = "";
        const rawKey = e.key;
        if (!["Control", "Alt", "Shift", "Meta"].includes(rawKey)) {
          if (e.code === "Space" || rawKey === " ") {
            key = "Space";
          } else if (e.code.startsWith("Key")) {
            key = e.code.slice(3).toUpperCase();
          } else if (e.code.startsWith("Digit")) {
            key = e.code.slice(5);
          } else if (rawKey.length === 1) {
            key = rawKey.toUpperCase();
          } else {
            key = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
          }
        }

        const combined = [...modifiers, key].filter(Boolean).join("+");
        if (combined) {
          if (key !== "") {
            input.value = normalizeShortcut(combined);
            void this.#applyShortcutChanges();
          } else {
            // Partial combination (modifiers only, e.g. "Ctrl+Alt") — show in input field
            // but do NOT trigger IPC to Rust until a non-modifier key is pressed.
            input.value = combined;
          }
        }
      });

      const normalizeOrRevert = () => {
        if (hasPrimaryKey(input.value)) {
          input.value = normalizeShortcut(input.value);
          void this.#applyShortcutChanges();
        } else {
          // Revert to stored value if left incomplete or invalid on blur/change
          const fallback = this.#lastShortcuts?.[def.id] ?? def.defaultShortcut;
          input.value = fallback;
          input.classList.remove("shortcut__input--error");
        }
      };

      input.addEventListener("change", normalizeOrRevert);
      input.addEventListener("blur", normalizeOrRevert);

      row.append(label, input);
      this.#shortcutInputs.set(def.id, input);
      this.#shortcuts.append(row);
    }
  }

  async #applyShortcutChanges(): Promise<void> {
    const current: Record<string, string> = {};
    for (const [actionId, input] of this.#shortcutInputs) {
      current[actionId] = normalizeShortcut(input.value);
    }

    const conflicts = findShortcutConflicts(current);
    let hasConflict = false;

    for (const [actionId, input] of this.#shortcutInputs) {
      if (conflicts[actionId] !== null) {
        input.classList.add("shortcut__input--error");
        hasConflict = true;
      } else {
        input.classList.remove("shortcut__input--error");
      }
    }

    if (hasConflict) {
      this.#shortcutsError.textContent = "Conflicto: atajo duplicado entre funciones.";
      this.#shortcutsError.hidden = false;
      return;
    }

    this.#shortcutsError.hidden = true;
    const res = await this.actions.changeShortcuts(current as ShortcutMap);
    if (!res.success) {
      this.#shortcutsError.textContent = res.error ?? "No se pudo actualizar el atajo.";
      this.#shortcutsError.hidden = false;
      for (const input of this.#shortcutInputs.values()) {
        input.classList.add("shortcut__input--error");
      }
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

  #buildDimButtons(): void {
    for (const preset of DIM_OPACITY_PRESETS) {
      const button = chip(formatDimOpacity(preset), () => this.actions.changeDimOpacity(preset));

      this.#dimButtons.set(preset, button);
      this.#dims.append(button);
    }
  }

  #buildGoalButtons(): void {
    for (const preset of DAILY_GOAL_PRESETS) {
      const button = chip(formatDailyGoal(preset), () => this.actions.changeDailyGoal(preset));

      this.#goalButtons.set(preset, button);
      this.#goals.append(button);
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
