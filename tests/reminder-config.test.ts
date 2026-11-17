import { describe, expect, it } from "vitest";

import {
  buildReminderConfig,
  reminderConfigCacheHit,
  resolveReminderConfig,
} from "../src/core/reminder-config";
import type { CustomReminder } from "../src/core/reminders";
import { reminderPacksFor } from "../src/messages/reminders";

const reminders = { stretch: true, water: false };
const custom: readonly CustomReminder[] = [
  { id: "sip", text: "sip water", everyMinutes: 1, anchor: "focus" },
];

function inputs(
  extra: Partial<{
    reminders: Readonly<Record<string, boolean>>;
    customReminders: readonly CustomReminder[];
    language: "en" | "es";
  }> = {},
) {
  return {
    reminders,
    customReminders: custom,
    language: "en" as const,
    ...extra,
  };
}

describe("reminderConfigCacheHit", () => {
  it("misses when there is no cache yet", () => {
    expect(reminderConfigCacheHit(null, inputs())).toBe(false);
  });

  it("hits when the three inputs are the same objects, even if the wrapper is new", () => {
    const first = inputs();
    expect(reminderConfigCacheHit(first, first)).toBe(true);
    expect(reminderConfigCacheHit(first, { ...first })).toBe(true);
  });

  it("misses when reminders, custom reminders, or language are replaced", () => {
    const cached = inputs();
    expect(
      reminderConfigCacheHit(cached, inputs({ reminders: { ...reminders, stretch: false } })),
    ).toBe(false);
    expect(
      reminderConfigCacheHit(cached, inputs({ customReminders: [...custom] })),
    ).toBe(false);
    expect(reminderConfigCacheHit(cached, inputs({ language: "es" }))).toBe(false);
  });
});

describe("buildReminderConfig", () => {
  it("merges shipped packs with always-on custom ids", () => {
    const config = buildReminderConfig(inputs());
    const shipped = reminderPacksFor("en");

    expect(config.allReminders).toHaveLength(shipped.length + 1);
    expect(config.allReminders.some((pack) => pack.id === "custom:sip")).toBe(true);
    expect(config.enabled["custom:sip"]).toBe(true);
    expect(config.enabled.stretch).toBe(true);
    expect(config.enabled.water).toBe(false);
  });

  it("swaps shipped lines when the language changes", () => {
    const english = buildReminderConfig(inputs({ language: "en" }));
    const spanish = buildReminderConfig(inputs({ language: "es" }));
    const firstEn = english.allReminders[0];
    const firstEs = spanish.allReminders[0];

    expect(firstEn?.id).toBe(firstEs?.id);
    expect(firstEn?.lines).not.toEqual(firstEs?.lines);
  });
});

describe("resolveReminderConfig", () => {
  it("rebuilds on a miss and reuses the same object on a hit", () => {
    const first = resolveReminderConfig(null, inputs());
    expect(first.hit).toBe(false);

    const second = resolveReminderConfig(first.config, inputs());
    expect(second.hit).toBe(true);
    expect(second.config).toBe(first.config);

    const afterEdit = resolveReminderConfig(
      first.config,
      inputs({ reminders: { ...reminders, water: true } }),
    );
    expect(afterEdit.hit).toBe(false);
    expect(afterEdit.config).not.toBe(first.config);
    expect(afterEdit.config.enabled.water).toBe(true);
  });
});
