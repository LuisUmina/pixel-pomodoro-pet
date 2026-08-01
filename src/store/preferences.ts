import { DEFAULT_SETTINGS } from "../core/pomodoro";
import { MAX_QUIET_MS } from "../core/quiet";
import { defaultEnabled } from "../core/reminders";
import type { PomodoroSettings } from "../core/types";
import { REMINDER_PACKS } from "../messages/reminders";
import { isVoice, type Voice } from "../messages/types";
import { DEFAULT_UI_SCALE, clampUiScale } from "../scale";
import { DEFAULT_CHARACTER_ID, isCharacterId } from "../sprites/characters";
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from "../sprites/themes";
import type { JsonStore } from "./persistence";

const STORAGE_KEY = "pixel-pomodoro-pet:preferences";

export const TASK_MAX_LENGTH = 48;

export const DEFAULT_VOICE: Voice = "dev";

export interface Preferences {
  readonly themeId: ThemeId;
  /** Which mascot lives in the widget. */
  readonly characterId: string;
  readonly settings: PomodoroSettings;
  readonly task: string;
  readonly soundEnabled: boolean;
  /** Personality the mascot speaks in, or `off` for silence. */
  readonly voice: Voice;
  /** Reminder pack id to whether the user wants it. */
  readonly reminders: Readonly<Record<string, boolean>>;
  /** When a temporary vow of silence expires; 0 when there is none. */
  readonly quietUntil: number;
  /** Widget size multiplier; the native window is resized to match. */
  readonly uiScale: number;
  /** Frame shrunk to just the mascot and the clock. */
  readonly miniMode: boolean;
  /** ISO day that `completedToday` belongs to; a new day resets the count. */
  readonly day: string;
  readonly completedToday: number;
}

export function defaultPreferences(day: string): Preferences {
  return {
    themeId: DEFAULT_THEME_ID,
    characterId: DEFAULT_CHARACTER_ID,
    settings: DEFAULT_SETTINGS,
    task: "",
    soundEnabled: true,
    voice: DEFAULT_VOICE,
    reminders: defaultEnabled(REMINDER_PACKS),
    quietUntil: 0,
    uiScale: DEFAULT_UI_SCALE,
    miniMode: false,
    day,
    completedToday: 0,
  };
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
    settings: readSettings(raw["settings"]),
    task: typeof raw["task"] === "string" ? raw["task"].slice(0, TASK_MAX_LENGTH) : "",
    soundEnabled: typeof raw["soundEnabled"] === "boolean" ? raw["soundEnabled"] : true,
    voice: isVoice(raw["voice"]) ? raw["voice"] : defaults.voice,
    reminders: readReminders(raw["reminders"]),
    quietUntil: readQuietUntil(raw["quietUntil"]),
    uiScale:
      typeof raw["uiScale"] === "number" ? clampUiScale(raw["uiScale"]) : DEFAULT_UI_SCALE,
    miniMode: typeof raw["miniMode"] === "boolean" ? raw["miniMode"] : false,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
