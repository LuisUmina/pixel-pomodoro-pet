import { describe, expect, it } from "vitest";

import { pickBehavior, type Behavior } from "../src/sprites/behaviors";
import {
  CHARACTERS,
  MAX_BOB,
  MAX_SHIFT,
  PET_STATES,
} from "../src/sprites/characters";
import { getTheme } from "../src/sprites/themes";
import { TRANSPARENT } from "../src/sprites/types";

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

  it("gives the top of the range to the last behaviour", () => {
    const pool = [behavior("a"), behavior("b")];

    expect(pickBehavior("idle", undefined, 1, pool)?.id).toBe("b");
  });

  it("can still reach a behaviour weighted a millionth of the total", () => {
    // Shaving the roll to avoid the endpoint would swallow this one whole.
    const pool = [
      behavior("common", { weights: { idle: 1_000_000 } }),
      behavior("needle", { weights: { idle: 1 } }),
    ];

    expect(pickBehavior("idle", undefined, 0.9999999, pool)?.id).toBe("needle");
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

describe("every bundled character", () => {
  it("gives each mood more than one thing to do, so none of them loops", () => {
    // A mood with a single behaviour is the two-frame loop phase 3 set out
    // to get rid of. Celebrating is a burst of seconds, so one is enough.
    const thin = CHARACTERS.flatMap((character) =>
      PET_STATES.filter((state) => {
        const offered = character.behaviors.filter(
          (entry) => (entry.weights[state] ?? 0) > 0,
        );
        return offered.length < (state === "celebrate" ? 1 : 2);
      }).map((state) => `${character.id}/${state}`),
    );

    expect(thin).toEqual([]);
  });

  it("stays inside the room the canvas reserves", () => {
    for (const character of CHARACTERS) {
      for (const entry of character.behaviors) {
        for (const frame of entry.frames) {
          expect(Math.abs(frame.offsetX ?? 0)).toBeLessThanOrEqual(MAX_SHIFT);
          expect(frame.offsetY).toBeGreaterThanOrEqual(0);
          expect(frame.offsetY).toBeLessThanOrEqual(MAX_BOB);
        }
      }
    }
  });

  it("only paints with keys every theme can colour", () => {
    const painted = Object.keys(getTheme("tokyo-night").sprite);
    const unknown: string[] = [];

    for (const character of CHARACTERS) {
      for (const entry of character.behaviors) {
        for (const frame of entry.frames) {
          for (const patch of frame.patches) {
            const used = [...new Set(patch.rows.join(""))].filter(
              (key) => key !== TRANSPARENT && key !== " ",
            );

            for (const key of used) {
              if (!painted.includes(key)) {
                unknown.push(`${character.id}/${entry.id}: ${key}`);
              }
            }
          }
        }
      }
    }

    expect(unknown).toEqual([]);
  });
});
