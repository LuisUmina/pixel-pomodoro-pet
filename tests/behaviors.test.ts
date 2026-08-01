import { describe, expect, it } from "vitest";

import { BEHAVIORS, pickBehavior, type Behavior } from "../src/sprites/behaviors";
import { DUCK_SIZE, MAX_BOB, MAX_SHIFT, type PetState } from "../src/sprites/duck";
import { getTheme } from "../src/sprites/themes";
import { TRANSPARENT } from "../src/sprites/types";

const STATES: readonly PetState[] = ["idle", "focus", "rest", "celebrate", "sleepy"];

function behavior(id: string, extra: Partial<Behavior> = {}): Behavior {
  return {
    id,
    loops: 1,
    weights: { idle: 1 },
    frames: [{ patches: [], offsetY: 0, durationMs: 100 }],
    ...extra,
  };
}

describe("pickBehavior", () => {
  it("only offers behaviours the mood actually has", () => {
    const pool = [behavior("a"), behavior("b", { weights: { focus: 1 } })];

    expect(pickBehavior("idle", undefined, 0.5, pool)?.id).toBe("a");
    expect(pickBehavior("focus", undefined, 0.5, pool)?.id).toBe("b");
  });

  it("returns nothing for a mood with no behaviours", () => {
    expect(pickBehavior("sleepy", undefined, 0.5, [behavior("a")])).toBeNull();
  });

  it("avoids repeating what it just did", () => {
    const pool = [behavior("a"), behavior("b")];

    // Whatever the die says, the one just performed is off the table.
    for (const roll of [0, 0.4, 0.6, 0.99]) {
      expect(pickBehavior("idle", "a", roll, pool)?.id).toBe("b");
    }
  });

  it("repeats rather than freezing when a mood has only one behaviour", () => {
    expect(pickBehavior("idle", "a", 0.5, [behavior("a")])?.id).toBe("a");
  });

  it("respects the weights", () => {
    const pool = [
      behavior("common", { weights: { idle: 9 } }),
      behavior("rare", { weights: { idle: 1 } }),
    ];

    expect(pickBehavior("idle", undefined, 0.5, pool)?.id).toBe("common");
    expect(pickBehavior("idle", undefined, 0.95, pool)?.id).toBe("rare");
  });

  it("survives a die that misbehaves", () => {
    const pool = [behavior("a"), behavior("b")];

    for (const roll of [-1, 0, 1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pickBehavior("idle", undefined, roll, pool)).not.toBeNull();
    }
  });

  it("reaches every behaviour a mood offers", () => {
    const pool = [behavior("a"), behavior("b"), behavior("c")];
    const seen = new Set<string>();

    for (let roll = 0; roll < 1; roll += 0.05) {
      seen.add(pickBehavior("idle", undefined, roll, pool)?.id ?? "");
    }

    expect(seen).toEqual(new Set(["a", "b", "c"]));
  });
});

describe("the bundled behaviours", () => {
  it("give every mood something to do", () => {
    for (const state of STATES) {
      expect(pickBehavior(state, undefined, 0.5)).not.toBeNull();
    }
  });

  it("give every mood more than one thing to do, so none of them loops", () => {
    // A mood with a single behaviour is the two-frame loop this phase set
    // out to get rid of.
    const thin = STATES.filter((state) => {
      const offered = BEHAVIORS.filter((entry) => (entry.weights[state] ?? 0) > 0);
      // Celebrating is a burst of a few seconds, so one is enough there.
      return offered.length < (state === "celebrate" ? 1 : 2);
    });

    expect(thin).toEqual([]);
  });

  it("have unique ids", () => {
    const ids = BEHAVIORS.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never sit still longer than feels alive", () => {
    for (const entry of BEHAVIORS) {
      for (const frame of entry.frames) {
        expect(frame.durationMs).toBeGreaterThan(0);
        expect(frame.durationMs).toBeLessThanOrEqual(2_000);
      }
    }
  });

  it("stay inside the room the canvas reserves", () => {
    for (const entry of BEHAVIORS) {
      for (const frame of entry.frames) {
        expect(Math.abs(frame.offsetX ?? 0)).toBeLessThanOrEqual(MAX_SHIFT);
        expect(frame.offsetY).toBeGreaterThanOrEqual(0);
        expect(frame.offsetY).toBeLessThanOrEqual(MAX_BOB);
      }
    }
  });

  it("always walk back to where they started", () => {
    // A wander that ends off-centre would drift further every performance.
    for (const entry of BEHAVIORS) {
      const last = entry.frames[entry.frames.length - 1];
      expect({ id: entry.id, x: last?.offsetX ?? 0 }).toEqual({ id: entry.id, x: 0 });
    }
  });

  it("run at least one loop", () => {
    for (const entry of BEHAVIORS) {
      expect(entry.loops).toBeGreaterThanOrEqual(1);
      expect(entry.frames.length).toBeGreaterThan(0);
    }
  });

  it("only paint with keys the themes can colour", () => {
    const painted = Object.keys(getTheme("tokyo-night").sprite);

    for (const entry of BEHAVIORS) {
      for (const frame of entry.frames) {
        for (const patch of frame.patches) {
          const used = [...new Set(patch.rows.join(""))].filter(
            (key) => key !== TRANSPARENT && key !== " ",
          );

          for (const key of used) {
            expect({ id: entry.id, key, known: painted.includes(key) }).toEqual({
              id: entry.id,
              key,
              known: true,
            });
          }
        }
      }
    }
  });

  it("keep every patch on the sprite", () => {
    for (const entry of BEHAVIORS) {
      for (const frame of entry.frames) {
        for (const patch of frame.patches) {
          expect(patch.x).toBeGreaterThanOrEqual(0);
          expect(patch.y).toBeGreaterThanOrEqual(0);
          expect(patch.y + patch.rows.length).toBeLessThanOrEqual(DUCK_SIZE);

          for (const row of patch.rows) {
            expect(patch.x + row.length).toBeLessThanOrEqual(DUCK_SIZE);
          }
        }
      }
    }
  });
});
