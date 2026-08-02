import { describe, expect, it } from "vitest";

import {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacter,
  isCharacterId,
  parseCharacter,
  parseRegistry,
} from "../src/sprites/characters";

/** A minimal valid character the rejection tests can break one field at a time. */
function valid(): Record<string, unknown> {
  return {
    id: "x",
    name: "X",
    label: "X",
    hint: "x",
    size: 8,
    base: Array.from({ length: 8 }, () => "........"),
    patches: { dot: { x: 0, y: 0, rows: ["a"] } },
    behaviors: [
      {
        id: "only",
        loops: 1,
        weights: { idle: 1, focus: 1, rest: 1, celebrate: 1, sleepy: 1 },
        frames: [{ patches: ["dot"], offsetY: 0, durationMs: 500 }],
      },
    ],
  };
}

describe("the registry", () => {
  it("bundles the duck, and the duck is the default", () => {
    expect(isCharacterId(DEFAULT_CHARACTER_ID)).toBe(true);
    expect(getCharacter(DEFAULT_CHARACTER_ID).id).toBe("duck");
  });

  it("bundles the three phase 15 characters", () => {
    expect(CHARACTERS.map((character) => character.id)).toEqual(
      expect.arrayContaining(["tentacat", "bug", "coffee"]),
    );
    expect(getCharacter("tentacat").name).toBe("Gato pulpo");
    expect(getCharacter("bug").name).toBe("Bicho");
    expect(getCharacter("coffee").name).toBe("Café");
  });

  it("has unique ids and unique labels", () => {
    const ids = CHARACTERS.map((character) => character.id);
    const labels = CHARACTERS.map((character) => character.label);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("rejects an id it does not know", () => {
    expect(isCharacterId("dragon")).toBe(false);
    expect(isCharacterId(42)).toBe(false);
    expect(() => getCharacter("dragon")).toThrow(/unknown character/);
  });
});

describe("parseRegistry", () => {
  it("rejects a duplicate id", () => {
    // Otherwise getCharacter always returns the first and the second is
    // stranded -- unselectable, but present in settings looking clickable.
    const a = valid();
    const b = { ...valid(), label: "Y" };

    expect(() => parseRegistry([a, b])).toThrow(/duplicate character id/);
  });

  it("rejects a duplicate label", () => {
    // Two settings chips reading the same text, only one of them live.
    const a = valid();
    const b = { ...valid(), id: "y" };

    expect(() => parseRegistry([a, b])).toThrow(/duplicate character label/);
  });

  it("accepts distinct characters", () => {
    const a = valid();
    const b = { ...valid(), id: "y", label: "Y" };

    expect(parseRegistry([a, b]).map((c) => c.id)).toEqual(["x", "y"]);
  });
});

describe("parseCharacter", () => {
  it("accepts the minimal character", () => {
    expect(parseCharacter(valid()).id).toBe("x");
  });

  it("rejects a grid that is not square", () => {
    const bent = valid();
    bent["base"] = Array.from({ length: 8 }, () => ".......");

    expect(() => parseCharacter(bent)).toThrow(/8 pixels wide/);
  });

  it("rejects a patch that runs off the grid", () => {
    const spilled = valid();
    spilled["patches"] = { dot: { x: 7, y: 0, rows: ["aa"] } };

    expect(() => parseCharacter(spilled)).toThrow(/off the side/);
  });

  it("rejects a frame that references a patch that does not exist", () => {
    const dangling = valid();
    (dangling["behaviors"] as Record<string, unknown>[])[0]!["frames"] = [
      { patches: ["ghost"], offsetY: 0, durationMs: 500 },
    ];

    expect(() => parseCharacter(dangling)).toThrow(/does not exist/);
  });

  it("rejects a character with nothing to do in some mood", () => {
    const idleOnly = valid();
    (idleOnly["behaviors"] as Record<string, unknown>[])[0]!["weights"] = { idle: 1 };

    expect(() => parseCharacter(idleOnly)).toThrow(/nothing to do while/);
  });

  it("rejects a behaviour declared twice", () => {
    const doubled = valid();
    const behaviors = doubled["behaviors"] as Record<string, unknown>[];
    doubled["behaviors"] = [behaviors[0], { ...behaviors[0] }];

    expect(() => parseCharacter(doubled)).toThrow(/twice/);
  });

  it("rejects a frame that holds still too long", () => {
    const frozen = valid();
    (frozen["behaviors"] as Record<string, unknown>[])[0]!["frames"] = [
      { patches: [], offsetY: 0, durationMs: 5_000 },
    ];

    expect(() => parseCharacter(frozen)).toThrow(/bad duration/);
  });

  it("rejects a bob outside the reserved headroom", () => {
    const jumper = valid();
    (jumper["behaviors"] as Record<string, unknown>[])[0]!["frames"] = [
      { patches: [], offsetY: 9, durationMs: 500 },
    ];

    expect(() => parseCharacter(jumper)).toThrow(/bobs outside/);
  });

  it("rejects a wander that ends off-centre", () => {
    // Anything else drifts a little further on every performance.
    const drifter = valid();
    (drifter["behaviors"] as Record<string, unknown>[])[0]!["frames"] = [
      { patches: [], offsetX: 2, offsetY: 0, durationMs: 500 },
    ];

    expect(() => parseCharacter(drifter)).toThrow(/walk back to centre/);
  });

  it("rejects a weight for a state that does not exist", () => {
    const confused = valid();
    (confused["behaviors"] as Record<string, unknown>[])[0]!["weights"] = {
      idle: 1,
      focus: 1,
      rest: 1,
      celebrate: 1,
      sleepy: 1,
      bored: 1,
    };

    expect(() => parseCharacter(confused)).toThrow(/unknown state/);
  });
});
