import { DEFAULT_SETTINGS } from "../core/pomodoro";
import { MAX_QUIET_MS } from "../core/quiet";
import { defaultEnabled, readCustomReminder, type CustomReminder } from "../core/reminders";
import type { PomodoroSettings } from "../core/types";
import { DEFAULT_DAILY_GOAL, MAX_DAILY_GOAL, MIN_DAILY_GOAL, clampDailyGoal } from "../dailyGoal";
import { DEFAULT_DIM_OPACITY, MAX_DIM_OPACITY, MIN_DIM_OPACITY, clampDimOpacity } from "../dim";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "../i18n/language";
import { REMINDER_PACKS } from "../messages/reminders";
import { isVoice, type Voice } from "../messages/types";
import { DEFAULT_UI_SCALE, MAX_UI_SCALE, MIN_UI_SCALE, clampUiScale } from "../scale";
import { DEFAULT_CHARACTER_ID, isCharacterId } from "../sprites/characters";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_DEFINITIONS,
  readShortcuts,
  type ShortcutMap,
} from "../core/shortcuts";
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from "../sprites/themes";
import type { JsonStore } from "./persistence";

const STORAGE_KEY = "pixel-pomodoro-pet:preferences";

export const DEFAULT_VOICE: Voice = "dev";

export interface Preferences {
  readonly themeId: ThemeId;
  /** Which mascot lives in the widget. */
  readonly characterId: string;
  /** What the whole app — chrome, dialogue, reminders — is shown in. */
  readonly language: Language;
  readonly settings: PomodoroSettings;
  readonly soundEnabled: boolean;
  /** Personality the mascot speaks in, or `off` for silence. */
  readonly voice: Voice;
  /** Reminder pack id to whether the user wants it. */
  readonly reminders: Readonly<Record<string, boolean>>;
  /** User-authored lines, scheduled through the same reminder engine as packs. */
  readonly customReminders: readonly CustomReminder[];
  /** Keybindings for global hotkeys. */
  readonly shortcuts: ShortcutMap;
  /** When a temporary vow of silence expires; 0 when there is none. */
  readonly quietUntil: number;
  /** Widget size multiplier; the native window is resized to match. */
  readonly uiScale: number;
  /** Frame shrunk to just the mascot and the clock. */
  readonly miniMode: boolean;
  /** Floating checklist under the mascot, only shown while `miniMode` is on. */
  readonly taskChecklist: boolean;
  /** Opacity the widget fades to once a session runs unattended; 0 turns auto-fade off. */
  readonly dimOpacity: number;
  /** Pomodoros that make a good day, shown next to the tally; 0 turns it off. */
  readonly dailyGoal: number;
  /** ISO day that `completedToday` belongs to; a new day resets the count. */
  readonly day: string;
  readonly completedToday: number;
}

export function defaultPreferences(day: string): Preferences {
  return {
    themeId: DEFAULT_THEME_ID,
    characterId: DEFAULT_CHARACTER_ID,
    language: DEFAULT_LANGUAGE,
    settings: DEFAULT_SETTINGS,
    soundEnabled: true,
    voice: DEFAULT_VOICE,
    reminders: defaultEnabled(REMINDER_PACKS),
    customReminders: [],
    shortcuts: DEFAULT_SHORTCUTS,
    quietUntil: 0,
    uiScale: DEFAULT_UI_SCALE,
    miniMode: false,
    taskChecklist: false,
    dimOpacity: DEFAULT_DIM_OPACITY,
    dailyGoal: DEFAULT_DAILY_GOAL,
    day,
    completedToday: 0,
  };
}

/**
 * Fields Restore Defaults writes from the shipped profile. Theme, language,
 * sound, and the day's tally are not in that panel and stay on `current`.
 * `taskChecklist` is: leaving it out kept the mini-mode checklist on after
 * a reset that otherwise returned every other panel control to stock.
 */
export function restorePanelDefaults(current: Preferences, shipped: Preferences): Preferences {
  return {
    ...current,
    settings: shipped.settings,
    voice: shipped.voice,
    reminders: shipped.reminders,
    customReminders: shipped.customReminders,
    shortcuts: shipped.shortcuts,
    quietUntil: shipped.quietUntil,
    characterId: shipped.characterId,
    taskChecklist: shipped.taskChecklist,
  };
}

/**
 * Whether a backup value may replace stored preferences.
 *
 * `loadPreferences` fills every gap from the defaults. An empty object would
 * therefore wipe a real setup. A payload is importable when it has at least
 * one recognized field with a value the loader would keep, or when it is a
 * complete preferences record — including the all-default object export
 * writes for a new profile.
 */
export function isImportablePreferences(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false;
  }

  if (hasUsablePreference(raw)) {
    return true;
  }

  return isCompletePreferences(raw);
}

/**
 * Reads preferences defensively: anything missing, malformed or out of range
 * falls back to the default rather than propagating into the timer.
 */
export function loadPreferences(store: JsonStore, today: string): Preferences {
  const defaults = defaultPreferences(today);
  const raw = store.get(STORAGE_KEY);

  if (!isRecord(raw)) {
    return defaults;
  }

  const sameDay = raw["day"] === today;

  return {
    themeId: isThemeId(raw["themeId"]) ? raw["themeId"] : defaults.themeId,
    characterId: isCharacterId(raw["characterId"]) ? raw["characterId"] : defaults.characterId,
    language: isLanguage(raw["language"]) ? raw["language"] : defaults.language,
    settings: readSettings(raw["settings"]),
    soundEnabled: typeof raw["soundEnabled"] === "boolean" ? raw["soundEnabled"] : true,
    voice: isVoice(raw["voice"]) ? raw["voice"] : defaults.voice,
    reminders: readReminders(raw["reminders"]),
    customReminders: readCustomReminders(raw["customReminders"]),
    shortcuts: readShortcuts(raw["shortcuts"]),
    quietUntil: readQuietUntil(raw["quietUntil"]),
    uiScale:
      typeof raw["uiScale"] === "number" ? clampUiScale(raw["uiScale"]) : DEFAULT_UI_SCALE,
    miniMode: typeof raw["miniMode"] === "boolean" ? raw["miniMode"] : false,
    taskChecklist:
      typeof raw["taskChecklist"] === "boolean" ? raw["taskChecklist"] : false,
    dimOpacity:
      typeof raw["dimOpacity"] === "number"
        ? clampDimOpacity(raw["dimOpacity"])
        : DEFAULT_DIM_OPACITY,
    dailyGoal:
      typeof raw["dailyGoal"] === "number" ? clampDailyGoal(raw["dailyGoal"]) : DEFAULT_DAILY_GOAL,
    day: today,
    // Yesterday's tally is not today's.
    completedToday: sameDay ? readCount(raw["completedToday"]) : 0,
  };
}

export function savePreferences(store: JsonStore, preferences: Preferences): void {
  store.set(STORAGE_KEY, preferences);
}

function readSettings(value: unknown): PomodoroSettings {
  if (!isRecord(value)) {
    return DEFAULT_SETTINGS;
  }

  return {
    focusMinutes: readMinutes(value["focusMinutes"], DEFAULT_SETTINGS.focusMinutes),
    shortBreakMinutes: readMinutes(
      value["shortBreakMinutes"],
      DEFAULT_SETTINGS.shortBreakMinutes,
    ),
    longBreakMinutes: readMinutes(
      value["longBreakMinutes"],
      DEFAULT_SETTINGS.longBreakMinutes,
    ),
    roundsPerCycle: clampInteger(
      value["roundsPerCycle"],
      DEFAULT_SETTINGS.roundsPerCycle,
      1,
      12,
    ),
    autoStartBreaks:
      typeof value["autoStartBreaks"] === "boolean"
        ? value["autoStartBreaks"]
        : DEFAULT_SETTINGS.autoStartBreaks,
    autoStartFocus:
      typeof value["autoStartFocus"] === "boolean"
        ? value["autoStartFocus"]
        : DEFAULT_SETTINGS.autoStartFocus,
  };
}

/**
 * Only packs this build ships are kept, and only when the stored value is
 * actually a boolean. A pack retired in a later release drops out on its own,
 * and one added later arrives at its shipped default rather than off.
 */
function readReminders(value: unknown): Record<string, boolean> {
  const stored = isRecord(value) ? value : {};
  const enabled: Record<string, boolean> = {};

  for (const pack of REMINDER_PACKS) {
    const choice = stored[pack.id];
    enabled[pack.id] = typeof choice === "boolean" ? choice : pack.enabledByDefault;
  }

  return enabled;
}

function readCustomReminders(value: unknown): readonly CustomReminder[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const reminders: CustomReminder[] = [];
  for (const raw of value) {
    const reminder = readCustomReminder(raw);
    if (reminder && !seen.has(reminder.id)) {
      seen.add(reminder.id);
      reminders.push(reminder);
    }
  }
  return reminders;
}

/**
 * A quiet spell is an expiry, so the only thing a bad value can do is silence
 * the mascot for at most one sitting. Anything further out than the cap came
 * from a clock, not a person.
 */
function readQuietUntil(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  // Anything already spent is dropped rather than carried around: a stale
  // expiry is one backwards clock correction away from silencing the mascot
  // for a spell nobody asked for. Anything past the cap came from a clock too.
  const remaining = value - Date.now();
  return remaining > 0 && remaining <= MAX_QUIET_MS ? Math.floor(value) : 0;
}

function readMinutes(value: unknown, fallback: number): number {
  return clampInteger(value, fallback, 1, 180);
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function hasUsablePreference(raw: Record<string, unknown>): boolean {
  return (
    isThemeId(raw["themeId"]) ||
    isCharacterId(raw["characterId"]) ||
    isLanguage(raw["language"]) ||
    hasUsableSettings(raw["settings"]) ||
    typeof raw["soundEnabled"] === "boolean" ||
    isVoice(raw["voice"]) ||
    hasUsableReminderChoice(raw["reminders"]) ||
    hasUsableCustomReminder(raw["customReminders"]) ||
    hasUsableShortcut(raw["shortcuts"]) ||
    isQuietUntil(raw["quietUntil"]) ||
    isUiScale(raw["uiScale"]) ||
    typeof raw["miniMode"] === "boolean" ||
    typeof raw["taskChecklist"] === "boolean" ||
    isDimOpacity(raw["dimOpacity"]) ||
    isDailyGoal(raw["dailyGoal"]) ||
    isStoredDay(raw["day"]) ||
    isStoredCount(raw["completedToday"])
  );
}

function isCompletePreferences(raw: Record<string, unknown>): boolean {
  return (
    isThemeId(raw["themeId"]) &&
    isCharacterId(raw["characterId"]) &&
    isLanguage(raw["language"]) &&
    isCompleteSettings(raw["settings"]) &&
    typeof raw["soundEnabled"] === "boolean" &&
    isVoice(raw["voice"]) &&
    isCompleteReminders(raw["reminders"]) &&
    isCompleteCustomReminders(raw["customReminders"]) &&
    isCompleteShortcuts(raw["shortcuts"]) &&
    isQuietUntil(raw["quietUntil"]) &&
    isUiScale(raw["uiScale"]) &&
    typeof raw["miniMode"] === "boolean" &&
    typeof raw["taskChecklist"] === "boolean" &&
    isDimOpacity(raw["dimOpacity"]) &&
    isDailyGoal(raw["dailyGoal"]) &&
    isStoredDay(raw["day"]) &&
    isStoredCount(raw["completedToday"])
  );
}

function hasUsableSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isMinute(value["focusMinutes"]) ||
    isMinute(value["shortBreakMinutes"]) ||
    isMinute(value["longBreakMinutes"]) ||
    isRounds(value["roundsPerCycle"]) ||
    typeof value["autoStartBreaks"] === "boolean" ||
    typeof value["autoStartFocus"] === "boolean"
  );
}

function isCompleteSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isMinute(value["focusMinutes"]) &&
    isMinute(value["shortBreakMinutes"]) &&
    isMinute(value["longBreakMinutes"]) &&
    isRounds(value["roundsPerCycle"]) &&
    typeof value["autoStartBreaks"] === "boolean" &&
    typeof value["autoStartFocus"] === "boolean"
  );
}

function hasUsableReminderChoice(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return REMINDER_PACKS.some((pack) => typeof value[pack.id] === "boolean");
}

function isCompleteReminders(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return REMINDER_PACKS.every((pack) => typeof value[pack.id] === "boolean");
}

function hasUsableCustomReminder(value: unknown): boolean {
  return Array.isArray(value) && value.some((entry) => readCustomReminder(entry) !== null);
}

function isCompleteCustomReminders(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => readCustomReminder(entry) !== null);
}

function hasUsableShortcut(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return SHORTCUT_DEFINITIONS.some((definition) => isShortcut(value[definition.id]));
}

function isCompleteShortcuts(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return SHORTCUT_DEFINITIONS.every((definition) => isShortcut(value[definition.id]));
}

function isShortcut(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function isQuietUntil(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isUiScale(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_UI_SCALE &&
    value <= MAX_UI_SCALE
  );
}

function isDimOpacity(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_DIM_OPACITY &&
    value <= MAX_DIM_OPACITY
  );
}

function isDailyGoal(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_DAILY_GOAL &&
    value <= MAX_DAILY_GOAL
  );
}

function isStoredDay(value: unknown): boolean {
  return typeof value === "string" && value !== "";
}

function isStoredCount(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isMinute(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 180;
}

function isRounds(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
