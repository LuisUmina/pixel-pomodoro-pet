import { describe, expect, it } from "vitest";

import {
  AMBIENT_GAP_MS,
  AWAY_MS,
  INITIAL_DIALOGUE,
  allowAmbient,
  ambientTrigger,
  speak,
  type DialogueRequest,
  type DialogueState,
} from "../src/core/dialogue";
import { CATALOG, parseCatalog } from "../src/messages/catalog";
import {
  MAX_LINE_LENGTH,
  TONES,
  TRIGGERS,
  type Line,
  type Tone,
  type Trigger,
} from "../src/messages/types";

const NOW = 1_700_000_000_000;

function line(id: string, extra: Partial<Line> = {}): Line {
  return { id, trigger: "focusStart", tone: "dev", text: id, ...extra };
}

function request(extra: Partial<DialogueRequest> = {}): DialogueRequest {
  return {
    trigger: "focusStart",
    voice: "dev",
    now: NOW,
    completedToday: 0,
    hour: 12,
    ...extra,
  };
}

/** Always picks the first candidate, so selection is deterministic. */
const first = (): number => 0;

describe("speak", () => {
  it("picks a line matching the trigger and the voice", () => {
    const catalog = [
      line("wrong-trigger", { trigger: "paused" }),
      line("wrong-tone", { tone: "hype" }),
      line("right"),
    ];

    expect(speak(INITIAL_DIALOGUE, request(), catalog, first).line?.id).toBe("right");
  });

  it("stays quiet when the voice is off", () => {
    const result = speak(INITIAL_DIALOGUE, request({ voice: "off" }), [line("a")], first);

    expect(result.line).toBeNull();
    expect(result.state).toBe(INITIAL_DIALOGUE);
  });

  it("stays quiet when nothing matches", () => {
    const result = speak(INITIAL_DIALOGUE, request({ trigger: "idle" }), [line("a")], first);

    expect(result.line).toBeNull();
  });

  it("remembers what it just said", () => {
    const result = speak(INITIAL_DIALOGUE, request(), [line("a")], first);

    expect(result.state.recent).toEqual(["a"]);
    expect(result.state.lastSpokeAt).toBe(NOW);
  });

  it("prefers a line it has not used lately", () => {
    const state: DialogueState = { lastSpokeAt: 0, recent: ["a"] };
    const result = speak(state, request(), [line("a"), line("b")], first);

    expect(result.line?.id).toBe("b");
  });

  it("repeats rather than falling silent once every line is used", () => {
    const state: DialogueState = { lastSpokeAt: 0, recent: ["a", "b"] };
    const result = speak(state, request(), [line("a"), line("b")], first);

    expect(result.line?.id).toBe("a");
  });

  it("does not let the memory grow without bound", () => {
    const catalog = Array.from({ length: 20 }, (_, index) => line(`line-${index}`));
    let state = INITIAL_DIALOGUE;

    for (let round = 0; round < 20; round += 1) {
      state = speak(state, request(), catalog, first).state;
    }

    expect(state.recent.length).toBeLessThanOrEqual(8);
    expect(new Set(state.recent).size).toBe(state.recent.length);
  });
});

describe("ambient cooldown", () => {
  const ambient = request({ trigger: "idle" });
  const catalog = [line("chatter", { trigger: "idle" })];

  it("holds ambient chatter back until the gap has passed", () => {
    const state: DialogueState = { lastSpokeAt: NOW - 1_000, recent: [] };

    expect(speak(state, ambient, catalog, first).line).toBeNull();
  });

  it("lets ambient chatter through once the gap has passed", () => {
    const state: DialogueState = { lastSpokeAt: NOW - AMBIENT_GAP_MS, recent: [] };

    expect(speak(state, ambient, catalog, first).line?.id).toBe("chatter");
  });

  it("never holds back a line the user's own action triggered", () => {
    const state: DialogueState = { lastSpokeAt: NOW - 1_000, recent: [] };
    const result = speak(state, request(), [line("event")], first);

    expect(result.line?.id).toBe("event");
  });

  it("restarts the cooldown even when the line was not ambient", () => {
    const spoken = speak(INITIAL_DIALOGUE, request(), [line("event")], first).state;

    expect(speak(spoken, { ...ambient, now: NOW }, catalog, first).line).toBeNull();
  });

  it("can be cleared so a voice change is demonstrated at once", () => {
    const state = allowAmbient({ lastSpokeAt: NOW, recent: [] });

    expect(speak(state, ambient, catalog, first).line?.id).toBe("chatter");
  });

  it("is not confused by a clock corrected backwards", () => {
    // Without this the mascot goes quiet for the correction plus the gap.
    const state: DialogueState = { lastSpokeAt: NOW + 60 * 60_000, recent: [] };

    expect(speak(state, ambient, catalog, first).line?.id).toBe("chatter");
  });
});

describe("ambientTrigger", () => {
  const check = { sinceLastCheckMs: 60_000, running: false, roll: 0 };

  it("greets you after a gap long enough to mean you were away", () => {
    expect(ambientTrigger({ ...check, sinceLastCheckMs: AWAY_MS + 1 })).toBe("welcomeBack");
  });

  it("treats an ordinary interval as ordinary idle chatter", () => {
    expect(ambientTrigger(check)).toBe("idle");
  });

  it("skips most idle checks so the chatter is not a metronome", () => {
    expect(ambientTrigger({ ...check, roll: 0.99 })).toBeNull();
  });

  it("says nothing at all while a session is running", () => {
    expect(ambientTrigger({ ...check, running: true })).toBeNull();
  });

  it("stays quiet even about a long absence if a session is running", () => {
    // Waking mid-session means the ticker is about to announce a completed
    // phase; a greeting racing that line would only clobber it.
    expect(
      ambientTrigger({ sinceLastCheckMs: AWAY_MS + 1, running: true, roll: 0 }),
    ).toBeNull();
  });
});

describe("line conditions", () => {
  it("honours a minimum tally", () => {
    const catalog = [line("veteran", { minCompleted: 4 })];

    expect(speak(INITIAL_DIALOGUE, request({ completedToday: 3 }), catalog, first).line).toBeNull();
    expect(
      speak(INITIAL_DIALOGUE, request({ completedToday: 4 }), catalog, first).line?.id,
    ).toBe("veteran");
  });

  it("honours a maximum tally", () => {
    const catalog = [line("rookie", { maxCompleted: 1 })];

    expect(speak(INITIAL_DIALOGUE, request({ completedToday: 2 }), catalog, first).line).toBeNull();
    expect(
      speak(INITIAL_DIALOGUE, request({ completedToday: 1 }), catalog, first).line?.id,
    ).toBe("rookie");
  });

  it("honours an hour window", () => {
    const catalog = [line("morning", { hours: [5, 9] })];

    expect(speak(INITIAL_DIALOGUE, request({ hour: 4 }), catalog, first).line).toBeNull();
    expect(speak(INITIAL_DIALOGUE, request({ hour: 5 }), catalog, first).line?.id).toBe("morning");
    expect(speak(INITIAL_DIALOGUE, request({ hour: 8 }), catalog, first).line?.id).toBe("morning");
    expect(speak(INITIAL_DIALOGUE, request({ hour: 9 }), catalog, first).line).toBeNull();
  });

  it("honours an hour window that wraps past midnight", () => {
    const catalog = [line("late", { hours: [22, 5] })];

    expect(speak(INITIAL_DIALOGUE, request({ hour: 21 }), catalog, first).line).toBeNull();
    expect(speak(INITIAL_DIALOGUE, request({ hour: 23 }), catalog, first).line?.id).toBe("late");
    expect(speak(INITIAL_DIALOGUE, request({ hour: 2 }), catalog, first).line?.id).toBe("late");
    expect(speak(INITIAL_DIALOGUE, request({ hour: 5 }), catalog, first).line).toBeNull();
  });
});

describe("the bundled catalogue", () => {
  it("has an unconditional line for every trigger and tone", () => {
    // A conditional line is not enough: without a fallback, a trigger would
    // silently produce nothing at the wrong hour or the wrong tally.
    const missing: string[] = [];

    for (const trigger of TRIGGERS) {
      for (const tone of TONES) {
        const covered = CATALOG.some(
          (entry) =>
            entry.trigger === trigger &&
            entry.tone === tone &&
            entry.minCompleted === undefined &&
            entry.maxCompleted === undefined &&
            entry.hours === undefined,
        );

        if (!covered) {
          missing.push(`${trigger}/${tone}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("answers every trigger and tone at any hour and any tally", () => {
    const silent: string[] = [];

    for (const trigger of TRIGGERS) {
      for (const tone of TONES) {
        for (const hour of [0, 6, 12, 23]) {
          for (const completedToday of [0, 1, 4, 12]) {
            const result = speak(
              INITIAL_DIALOGUE,
              { trigger, voice: tone, now: NOW, completedToday, hour },
              CATALOG,
              first,
            );

            if (!result.line) {
              silent.push(`${trigger}/${tone} @${hour}h ×${completedToday}`);
            }
          }
        }
      }
    }

    expect(silent).toEqual([]);
  });

  it("keeps every line inside the bubble", () => {
    const tooLong = CATALOG.filter((entry) => entry.text.length > MAX_LINE_LENGTH);

    expect(tooLong).toEqual([]);
  });

  it("gives the talkative tones room to vary", () => {
    // One line per trigger would repeat every single time.
    const thin: string[] = [];

    for (const trigger of TRIGGERS) {
      for (const tone of ["dev", "hype"] satisfies Tone[]) {
        const count = CATALOG.filter(
          (entry) => entry.trigger === trigger && entry.tone === tone,
        ).length;

        if (count < 4) {
          thin.push(`${trigger}/${tone} has ${count}`);
        }
      }
    }

    expect(thin).toEqual([]);
  });
});

describe("parseCatalog", () => {
  const valid = { id: "a", trigger: "idle" satisfies Trigger, tone: "dev" satisfies Tone, text: "hi" };

  it("accepts the bundled data", () => {
    expect(CATALOG.length).toBeGreaterThan(0);
  });

  it("rejects a duplicate id", () => {
    expect(() => parseCatalog([valid, valid])).toThrow(/duplicate/);
  });

  it("rejects an unknown trigger", () => {
    expect(() => parseCatalog([{ ...valid, trigger: "nope" }])).toThrow(/trigger/);
  });

  it("rejects an unknown tone", () => {
    expect(() => parseCatalog([{ ...valid, tone: "nope" }])).toThrow(/tone/);
  });

  it("rejects empty text", () => {
    expect(() => parseCatalog([{ ...valid, text: "   " }])).toThrow(/no text/);
  });

  it("rejects text that would overflow the bubble", () => {
    expect(() => parseCatalog([{ ...valid, text: "x".repeat(MAX_LINE_LENGTH + 1) }])).toThrow(
      /longer than/,
    );
  });

  it("rejects a range no tally can satisfy", () => {
    expect(() => parseCatalog([{ ...valid, minCompleted: 3, maxCompleted: 1 }])).toThrow(
      /never be reached/,
    );
  });

  it("rejects an hour outside the clock", () => {
    expect(() => parseCatalog([{ ...valid, hours: [9, 24] }])).toThrow(/0-23/);
  });

  it("rejects an empty hour window", () => {
    expect(() => parseCatalog([{ ...valid, hours: [9, 9] }])).toThrow(/empty hour window/);
  });
});
