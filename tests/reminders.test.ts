import { describe, expect, it } from "vitest";

import { formatQuiet, isQuiet, quietMinutesLeft, quietUntilFrom } from "../src/core/quiet";
import {
  INITIAL_REMINDERS,
  defaultEnabled,
  dueReminder,
  startReminders,
  type ReminderCheck,
  type ReminderState,
} from "../src/core/reminders";
import { REMINDER_PACKS, parsePacks, type ReminderPack } from "../src/messages/reminders";
import { MAX_LINE_LENGTH } from "../src/messages/types";

const NOW = 1_700_000_000_000;
const MINUTE = 60_000;

function pack(id: string, extra: Partial<ReminderPack> = {}): ReminderPack {
  return {
    id,
    label: id,
    hint: id,
    phases: ["focus"],
    everyMinutes: 20,
    enabledByDefault: true,
    lines: [`${id}-a`, `${id}-b`],
    ...extra,
  };
}

function check(extra: Partial<ReminderCheck> = {}): ReminderCheck {
  return { now: NOW, phase: "focus", running: true, enabled: { a: true }, ...extra };
}

const first = (): number => 0;

describe("dueReminder", () => {
  const packs = [pack("a")];
  const started: ReminderState = { firedAt: { a: NOW - 20 * MINUTE }, lastLine: {} };

  it("fires a pack that has reached its cadence", () => {
    expect(dueReminder(started, check(), packs, first)?.pack.id).toBe("a");
  });

  it("holds a pack that has not", () => {
    const early: ReminderState = { firedAt: { a: NOW - 19 * MINUTE }, lastLine: {} };

    expect(dueReminder(early, check(), packs, first)).toBeNull();
  });

  it("says nothing while the timer is not running", () => {
    expect(dueReminder(started, check({ running: false }), packs, first)).toBeNull();
  });

  it("respects the switch the user actually set", () => {
    expect(dueReminder(started, check({ enabled: { a: false } }), packs, first)).toBeNull();
    expect(dueReminder(started, check({ enabled: {} }), packs, first)).toBeNull();
  });

  it("only interrupts the phases the pack is anchored to", () => {
    expect(dueReminder(started, check({ phase: "shortBreak" }), packs, first)).toBeNull();

    const breaks = [pack("a", { phases: ["shortBreak", "longBreak"] })];
    expect(dueReminder(started, check({ phase: "shortBreak" }), breaks, first)?.pack.id).toBe("a");
  });

  it("records the moment it fired so the cadence restarts", () => {
    const after = dueReminder(started, check(), packs, first)?.state;

    expect(after?.firedAt["a"]).toBe(NOW);
    expect(dueReminder(after!, check(), packs, first)).toBeNull();
  });

  it("prefers whichever pack has waited longest past its cadence", () => {
    const two = [pack("a"), pack("b")];
    const state: ReminderState = {
      firedAt: { a: NOW - 25 * MINUTE, b: NOW - 40 * MINUTE },
      lastLine: {},
    };

    const due = dueReminder(state, check({ enabled: { a: true, b: true } }), two, first);
    expect(due?.pack.id).toBe("b");
  });

  it("fires a pack it has never seen before", () => {
    // A pack shipped in a later release has no recorded start.
    expect(dueReminder(INITIAL_REMINDERS, check(), packs, first)?.pack.id).toBe("a");
  });

  it("never repeats the line it used last", () => {
    const state: ReminderState = { firedAt: { a: NOW - 20 * MINUTE }, lastLine: { a: 0 } };

    // The only other line has to come up, whatever the die says.
    expect(dueReminder(state, check(), packs, first)?.line).toBe("a-b");
    expect(dueReminder(state, check(), packs, () => 0.999)?.line).toBe("a-b");
  });

  it("can still reach every line of a longer pack", () => {
    const wide = [pack("a", { lines: ["one", "two", "three", "four"] })];
    const state: ReminderState = { firedAt: { a: NOW - 20 * MINUTE }, lastLine: { a: 2 } };
    const seen = new Set<string>();

    for (const roll of [0, 0.34, 0.67, 0.999]) {
      seen.add(dueReminder(state, check(), wide, () => roll)?.line ?? "");
    }

    expect(seen).toEqual(new Set(["one", "two", "four"]));
  });
});

describe("startReminders", () => {
  it("stops everything falling due the moment the app opens", () => {
    const packs = [pack("a"), pack("b")];
    const state = startReminders(packs, NOW);

    expect(dueReminder(state, check({ enabled: { a: true, b: true } }), packs, first)).toBeNull();
  });
});

describe("defaultEnabled", () => {
  it("switches each pack to what it ships with", () => {
    expect(defaultEnabled([pack("a"), pack("b", { enabledByDefault: false })])).toEqual({
      a: true,
      b: false,
    });
  });
});

describe("quiet mode", () => {
  it("is off by default", () => {
    expect(isQuiet(0, NOW)).toBe(false);
  });

  it("runs out on its own", () => {
    const until = quietUntilFrom(30, NOW);

    expect(isQuiet(until, NOW + 29 * MINUTE)).toBe(true);
    expect(isQuiet(until, NOW + 31 * MINUTE)).toBe(false);
  });

  it("ignores an expiry too far out to have come from a person", () => {
    // A clock corrected backwards would otherwise leave it stuck on for good.
    expect(isQuiet(NOW + 13 * 60 * MINUTE, NOW)).toBe(false);
  });

  it("treats zero minutes as switching it off", () => {
    expect(quietUntilFrom(0, NOW)).toBe(0);
  });

  it("never counts down to zero while it is still on", () => {
    expect(quietMinutesLeft(quietUntilFrom(30, NOW), NOW + 29.5 * MINUTE)).toBe(1);
    expect(quietMinutesLeft(0, NOW)).toBe(0);
  });

  it("keeps the title bar short", () => {
    expect(formatQuiet(45)).toBe("45m");
    expect(formatQuiet(90)).toBe("90m");
    expect(formatQuiet(120)).toBe("2h");
  });
});

describe("the bundled packs", () => {
  it("parse", () => {
    expect(REMINDER_PACKS.length).toBeGreaterThan(0);
  });

  it("anchor break reminders to breaks and screen reminders to focus", () => {
    // Telling someone to stand up mid-focus is the thing to avoid.
    const water = REMINDER_PACKS.find((entry) => entry.id === "water");
    const eyes = REMINDER_PACKS.find((entry) => entry.id === "eyes");

    expect(water?.phases).not.toContain("focus");
    expect(eyes?.phases).toEqual(["focus"]);
  });

  it("keep every line inside the bubble", () => {
    const tooLong = REMINDER_PACKS.flatMap((entry) =>
      entry.lines.filter((line) => line.length > MAX_LINE_LENGTH),
    );

    expect(tooLong).toEqual([]);
  });

  it("start quiet enough not to ambush a new user", () => {
    const on = REMINDER_PACKS.filter((entry) => entry.enabledByDefault);

    expect(on.length).toBeLessThanOrEqual(2);
  });

  const valid = {
    id: "x",
    label: "x",
    hint: "x",
    phases: ["focus"],
    everyMinutes: 20,
    enabledByDefault: true,
    lines: ["a", "b"],
  };

  it("reject a duplicate id", () => {
    expect(() => parsePacks([valid, valid])).toThrow(/duplicate/);
  });

  it("reject an unknown phase", () => {
    expect(() => parsePacks([{ ...valid, phases: ["nope"] }])).toThrow(/unknown phase/);
  });

  it("reject a pack with no phase at all", () => {
    expect(() => parsePacks([{ ...valid, phases: [] }])).toThrow(/at least one phase/);
  });

  it("reject a cadence that is not whole minutes", () => {
    expect(() => parsePacks([{ ...valid, everyMinutes: 0 }])).toThrow(/cadence/);
    expect(() => parsePacks([{ ...valid, everyMinutes: 1.5 }])).toThrow(/cadence/);
  });

  it("reject a pack that could only ever repeat itself", () => {
    expect(() => parsePacks([{ ...valid, lines: ["only one"] }])).toThrow(/at least two lines/);
  });

  it("reject a line that would overflow the bubble", () => {
    expect(() =>
      parsePacks([{ ...valid, lines: ["a", "x".repeat(MAX_LINE_LENGTH + 1)] }]),
    ).toThrow(/longer than/);
  });
});
