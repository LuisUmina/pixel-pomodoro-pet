import { describe, expect, it } from "vitest";

import {
  framePatchSignature,
  memoizedComposedGrid,
  spriteGridForFrame,
} from "../src/sprites/compose";
import { CHARACTERS, getCharacter } from "../src/sprites/characters";
import { applyPatches } from "../src/sprites/renderer";
import type { SpriteGrid } from "../src/sprites/types";

const DUCK = getCharacter("duck");

describe("framePatchSignature", () => {
  it("joins names in order, so overlay order is part of the key", () => {
    expect(framePatchSignature(["eyes", "blink"])).toBe("eyes\0blink");
    expect(framePatchSignature(["blink", "eyes"])).not.toBe(framePatchSignature(["eyes", "blink"]));
  });
});

describe("memoizedComposedGrid", () => {
  it("reuses the same object for a repeated signature", () => {
    const cache = new Map<string, string[]>();
    let builds = 0;
    const compose = () => {
      builds += 1;
      return ["ab"];
    };

    const first = memoizedComposedGrid(cache, "k", compose);
    const second = memoizedComposedGrid(cache, "k", compose);
    const other = memoizedComposedGrid(cache, "other", compose);

    expect(first).toBe(second);
    expect(other).not.toBe(first);
    expect(builds).toBe(2);
  });
});

describe("spriteGridForFrame", () => {
  it("returns the precomputed grid without recomposing", () => {
    const grid = ["precomputed"];
    expect(spriteGridForFrame({ grid, patches: [{ x: 0, y: 0, rows: ["z"] }] }, ["base"])).toBe(
      grid,
    );
  });

  it("falls back to applyPatches when no grid was stored", () => {
    const base = ["....", "...."];
    const patches = [{ x: 1, y: 0, rows: ["ab"] }];
    expect(spriteGridForFrame({ patches }, base)).toEqual(applyPatches(base, patches));
  });
});

describe("parsed character frames", () => {
  it("store a composed grid that matches applyPatches", () => {
    for (const character of CHARACTERS) {
      for (const behavior of character.behaviors) {
        for (const frame of behavior.frames) {
          expect(frame.grid).toBeDefined();
          expect(frame.grid).toEqual(applyPatches(character.base, frame.patches));
        }
      }
    }
  });

  it("reuses one grid object for frames that share a patch list", () => {
    const byPatches = new Map<string, SpriteGrid>();
    let reused = 0;

    for (const behavior of DUCK.behaviors) {
      for (const frame of behavior.frames) {
        const key = frame.patches
          .map((patch) => `${patch.x},${patch.y}:${patch.rows.join("/")}`)
          .join("|");
        const prior = byPatches.get(key);
        if (prior) {
          expect(frame.grid).toBe(prior);
          reused += 1;
        } else if (frame.grid) {
          byPatches.set(key, frame.grid);
        }
      }
    }

    expect(reused).toBeGreaterThan(0);
  });
});
