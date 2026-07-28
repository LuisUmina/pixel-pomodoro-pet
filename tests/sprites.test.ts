import { describe, expect, it } from "vitest";

import { DUCK_BASE, DUCK_SIZE, PET_ANIMATIONS } from "../src/sprites/duck";
import { applyPatches } from "../src/sprites/renderer";
import { THEME_IDS, getTheme } from "../src/sprites/themes";
import { TRANSPARENT } from "../src/sprites/types";

describe("duck sprite", () => {
  it("is a square grid", () => {
    expect(DUCK_BASE).toHaveLength(DUCK_SIZE);
    for (const row of DUCK_BASE) {
      expect(row).toHaveLength(DUCK_SIZE);
    }
  });

  it("only uses keys the themes can paint", () => {
    const painted = Object.keys(getTheme("tokyo-night").sprite);
    const used = [...new Set(DUCK_BASE.join(""))].filter((key) => key !== TRANSPARENT);

    for (const key of used) {
      expect(painted).toContain(key);
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
    expect(applyPatches(DUCK_BASE, [])).toBe(DUCK_BASE);
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

  it("never changes the grid dimensions", () => {
    for (const frames of Object.values(PET_ANIMATIONS)) {
      for (const frame of frames) {
        const grid = applyPatches(DUCK_BASE, frame.patches);

        expect(grid).toHaveLength(DUCK_SIZE);
        for (const row of grid) {
          expect(row).toHaveLength(DUCK_SIZE);
        }
      }
    }
  });
});
