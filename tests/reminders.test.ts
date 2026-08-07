import { describe, expect, it } from "vitest";

import { formatQuiet, isQuiet, quietMinutesLeft, quietUntilFrom } from "../src/core/quiet";
import {
  INITIAL_REMINDERS,
  MAX_TICK_MS,
  accrueReminders,
  customReminderPacks,
  defaultEnabled,
  readCustomReminder,
  takeReminder,
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
  return { phase: "focus", enabled: { a: true }, ...extra };
}

const first = (): number => 0;

/**
 * Feeds `minutes` of session time through in quarter-second slices, the way
 * the ticker does, and reports what came due along the way.
 */
function run(
  state: ReminderState,
  extra: Partial<ReminderCheck> & { delivering?: boolean },
  packs: readonly ReturnType<typeof pack>[],
  minutes: number,
): { state: ReminderState; fired: string[] } {
  const { delivering = true, ...rest } = extra;
  const slice = 250;
  const fired: string[] = [];

  for (let done = 0; done < minutes * MINUTE; done += slice) {
    state = accrueReminders(state, slice, { ...check(rest), delivering }, packs);

    if (!delivering) {
      continue;
    }

    const due = takeReminder(state, check(rest), packs, first);
    if (due) {
      state = due.state;
      fired.push(due.pack.id);
    }
  }

  return { state, fired };
}

describe("accrueReminders", () => {
  const packs = [pack("a")];

  it("comes due only once the cadence has actually been worked", () => {
    expect(run(INITIAL_REMINDERS, {}, packs, 19).fired).toEqual([]);
    expect(run(INITIAL_REMINDERS, {}, packs, 20).fired).toEqual(["a"]);
  });

  it("keeps to its cadence rather than firing on every slice after the first", () => {
    expect(run(INITIAL_REMINDERS, {}, packs, 60).fired).toEqual(["a", "a", "a"]);
  });

  it("banks nothing for a phase the pack is not anchored to", () => {
    const away = run(INITIAL_REMINDERS, { phase: "shortBreak" }, packs, 40);

    expect(away.fired).toEqual([]);
    // The point of the whole model: time that was not spent staring at a
    // screen cannot count towards a rule about staring at a screen.
    expect(run(away.state, {}, packs, 19).fired).toEqual([]);
  });

  it("banks nothing while the mascot is silenced, and builds no backlog", () => {
    const quiet = run(INITIAL_REMINDERS, { delivering: false }, packs, 90);

    expect(quiet.fired).toEqual([]);
    // Ending quiet mode must not empty a queue of everything it swallowed.
    expect(run(quiet.state, {}, packs, 1).fired).toEqual([]);
  });

  it("banks nothing for a pack the user switched off, and builds no backlog", () => {
    const off = run(INITIAL_REMINDERS, { enabled: { a: false } }, packs, 90);

    expect(off.fired).toEqual([]);
    expect(run(off.state, {}, packs, 1).fired).toEqual([]);
  });

  it("keeps what a pack had banked when it becomes eligible again", () => {
    const part = run(INITIAL_REMINDERS, {}, packs, 15);
    const away = run(part.state, { phase: "shortBreak" }, packs, 120);

    expect(run(away.state, {}, packs, 5).fired).toEqual(["a"]);
  });

  it("refuses to bank an entire slept machine on one slice", () => {
    const slept = accrueReminders(
      INITIAL_REMINDERS,
      8 * 60 * 60_000,
      { ...check(), delivering: true },
      packs,
    );

    expect(slept.banked["a"]).toBe(MAX_TICK_MS);
  });

  it("ignores a slice that went backwards", () => {
    const back = accrueReminders(INITIAL_REMINDERS, -5000, { ...check(), delivering: true }, packs);

    expect(back.banked["a"] ?? 0).toBe(0);
  });

  it("adds up short slices the way the ticker delivers them", () => {
    // Four slices a second for twenty minutes has to land on the cadence.
    const banked = run(INITIAL_REMINDERS, {}, packs, 20);

    expect(banked.fired).toEqual(["a"]);
  });
});

describe("takeReminder", () => {
  const packs = [pack("a")];

  it("takes nothing when no pack has reached its cadence", () => {
    expect(takeReminder(INITIAL_REMINDERS, check(), packs, first)).toBeNull();
  });

  it("leaves the bank alone when the caller skips a turn", () => {
    // A phase ending has its own line, so the reminder waits rather than
    // being spent on a bubble nobody sees.
    const state: ReminderState = { banked: { a: 25 * MINUTE }, lastLine: {} };

    expect(takeReminder(state, check(), packs, first)?.state.banked["a"]).toBe(0);
    expect(state.banked["a"]).toBe(25 * MINUTE);
  });

  it("only offers packs anchored to the current phase", () => {
    const state: ReminderState = { banked: { a: 25 * MINUTE }, lastLine: {} };

    expect(takeReminder(state, check({ phase: "shortBreak" }), packs, first)).toBeNull();
  });

  it("only offers packs the user switched on", () => {
    const state: ReminderState = { banked: { a: 25 * MINUTE }, lastLine: {} };

    expect(takeReminder(state, check({ enabled: { a: false } }), packs, first)).toBeNull();
  });

  it("prefers whichever pack has banked the most beyond its cadence", () => {
    const two = [pack("a"), pack("b")];
    const state: ReminderState = { banked: { a: 21 * MINUTE, b: 30 * MINUTE }, lastLine: {} };

    const taken = takeReminder(state, check({ enabled: { a: true, b: true } }), two, first);
    expect(taken?.pack.id).toBe("b");
    // The one that lost keeps its bank, so it goes next.
    expect(taken?.state.banked["a"]).toBe(21 * MINUTE);
  });

  it("lets packs on different cadences take turns instead of starving one", () => {
    const two = [pack("a", { everyMinutes: 30 }), pack("b", { everyMinutes: 20 })];
    const fired = run(INITIAL_REMINDERS, { enabled: { a: true, b: true } }, two, 40).fired;

    expect(fired).toEqual(["b", "a", "b"]);
  });

  it("never repeats the line it used last", () => {
    const state: ReminderState = { banked: { a: 20 * MINUTE }, lastLine: { a: 0 } };

    // The only other line has to come up, whatever the die says.
    expect(takeReminder(state, check(), packs, first)?.line).toBe("a-b");
    expect(takeReminder(state, check(), packs, () => 0.999)?.line).toBe("a-b");
  });

  it("can still reach every line of a longer pack", () => {
    const wide = [pack("a", { lines: ["one", "two", "three", "four"] })];
    const state: ReminderState = { banked: { a: 20 * MINUTE }, lastLine: { a: 2 } };
    const seen = new Set<string>();

    for (const roll of [0, 0.34, 0.67, 0.999]) {
      seen.add(takeReminder(state, check(), wide, () => roll)?.line ?? "");
    }

    expect(seen).toEqual(new Set(["one", "two", "four"]));
  });

  it("is not due the moment the app opens", () => {
    expect(takeReminder(INITIAL_REMINDERS, check(), packs, first)).toBeNull();
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

describe("custom reminders", () => {
  it("uses the shared scheduler and anchors breaks to both break phases", () => {
    const custom = customReminderPacks([
      { id: "water", text: "Tomá agua", everyMinutes: 25, anchor: "break" },
    ]);

    expect(custom).toEqual([
      {
        id: "custom:water",
        lines: ["Tomá agua"],
        everyMinutes: 25,
        phases: ["shortBreak", "longBreak"],
      },
    ]);
  });

  it("reads only complete, safe persisted reminders", () => {
    expect(readCustomReminder({
      id: "r1",
      text: "  Mirá lejos  ",
      everyMinutes: 20,
      anchor: "focus",
    })).toEqual({ id: "r1", text: "Mirá lejos", everyMinutes: 20, anchor: "focus" });
    expect(readCustomReminder({ id: "r1", text: "x", everyMinutes: 0, anchor: "focus" })).toBeNull();
    expect(readCustomReminder({ id: "r1", text: "x", everyMinutes: 20, anchor: "later" })).toBeNull();
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
