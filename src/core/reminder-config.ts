import type { Language } from "../i18n/language";
import { reminderPacksFor } from "../messages/reminders";
import {
  customReminderPacks,
  type CustomReminder,
  type SchedulableReminder,
} from "./reminders";

/**
 * The three preference fields that decide which reminder packs exist and
 * which of them are on. `voice` and `quietUntil` are read live by the ticker
 * because they only gate delivery, not the pack list itself.
 */
export interface ReminderConfigInputs {
  readonly reminders: Readonly<Record<string, boolean>>;
  readonly customReminders: readonly CustomReminder[];
  readonly language: Language;
}

export interface ReminderConfig extends ReminderConfigInputs {
  readonly enabled: Readonly<Record<string, boolean>>;
  readonly allReminders: readonly SchedulableReminder[];
}

/**
 * Reference equality on the three inputs: settings edits replace those
 * objects, so a new `reminders` map, a new custom list, or a language swap
 * all miss. Idle ticks keep the same objects and hit.
 */
export function reminderConfigCacheHit(
  cache: ReminderConfigInputs | null,
  inputs: ReminderConfigInputs,
): boolean {
  return (
    cache !== null &&
    cache.reminders === inputs.reminders &&
    cache.customReminders === inputs.customReminders &&
    cache.language === inputs.language
  );
}

export function buildReminderConfig(inputs: ReminderConfigInputs): ReminderConfig {
  const custom = customReminderPacks(inputs.customReminders);
  const enabled = {
    ...inputs.reminders,
    ...Object.fromEntries(custom.map((reminder) => [reminder.id, true])),
  };
  const allReminders = [...reminderPacksFor(inputs.language), ...custom];
  return {
    reminders: inputs.reminders,
    customReminders: inputs.customReminders,
    language: inputs.language,
    enabled,
    allReminders,
  };
}

export function resolveReminderConfig(
  cache: ReminderConfig | null,
  inputs: ReminderConfigInputs,
): { config: ReminderConfig; hit: boolean } {
  if (cache !== null && reminderConfigCacheHit(cache, inputs)) {
    return { config: cache, hit: true };
  }

  return { config: buildReminderConfig(inputs), hit: false };
}
