import { describe, expect, it } from "vitest";

import { CHARACTERS, getCharacter } from "../src/sprites/characters";
import { applyPatches } from "../src/sprites/renderer";
import { THEME_IDS, getTheme } from "../src/sprites/themes";
import { TRANSPARENT } from "../src/sprites/types";

const DUCK = getCharacter("duck");

describe("character sprites", () => {
  it("are square grids", () => {
    for (const character of CHARACTERS) {
      expect(character.base).toHaveLength(character.size);
      for (const row of character.base) {
        expect(row).toHaveLength(character.size);
      }
    }
  });

  it("only use keys every theme can paint, in the base grid and every patch", () => {
    // A key missing from one theme would make pixels vanish on switch. The
    // renderer skips a colour it cannot find rather than erroring, so this is
    // the one thing a stray patch character breaks silently rather than loudly.
    for (const id of THEME_IDS) {
      const painted = Object.keys(getTheme(id).sprite);

      for (const character of CHARACTERS) {
        const baseKeys = [...new Set(character.base.join(""))].filter(
          (key) => key !== TRANSPARENT,
        );
        const patchKeys = character.behaviors.flatMap((behavior) =>
          behavior.frames.flatMap((frame) =>
            frame.patches.flatMap((patch) =>
              [...new Set(patch.rows.join(""))].filter(
                (key) => key !== TRANSPARENT && key !== " ",
              ),
            ),
          ),
        );

        for (const key of new Set([...baseKeys, ...patchKeys])) {
          expect({ theme: id, character: character.id, key, known: painted.includes(key) })
            .toEqual({ theme: id, character: character.id, key, known: true });
        }
      }
    }
  });
});

describe("themes", () => {
  it("all define the same sprite keys, so no theme loses pixels", () => {
    const reference = Object.keys(getTheme("tokyo-night").sprite).sort();

    for (const id of THEME_IDS) {
      expect(Object.keys(getTheme(id).sprite).sort()).toEqual(reference);
    }
  });
});

describe("applyPatches", () => {
  it("returns the base untouched when there is nothing to overlay", () => {
    expect(applyPatches(DUCK.base, [])).toBe(DUCK.base);
  });

  it("overwrites only the patched pixels", () => {
    const base = ["....", "....", "...."];
    const result = applyPatches(base, [{ x: 1, y: 1, rows: ["ab"] }]);

    expect(result).toEqual(["....", ".ab.", "...."]);
  });

  it("treats `.` as keep and a space as erase", () => {
    const result = applyPatches(["xxxx"], [{ x: 0, y: 0, rows: [". y "] }]);

    expect(result).toEqual(["x.y."]);
  });

  it("ignores patches that fall outside the grid", () => {
    const base = ["ab"];

    expect(applyPatches(base, [{ x: 5, y: 0, rows: ["z"] }])).toEqual(base);
    expect(applyPatches(base, [{ x: 0, y: 9, rows: ["z"] }])).toEqual(base);
  });

  it("never changes the grid dimensions, whatever any character composes", () => {
    for (const character of CHARACTERS) {
      for (const behavior of character.behaviors) {
        for (const frame of behavior.frames) {
          const grid = applyPatches(character.base, frame.patches);

          expect(grid).toHaveLength(character.size);
          for (const row of grid) {
            expect(row).toHaveLength(character.size);
          }
        }
      }
    }
  });
});
