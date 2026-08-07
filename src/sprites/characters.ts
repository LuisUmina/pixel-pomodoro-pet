/**
 * The character registry. A character is one self-contained JSON file — grid,
 * patches and behaviours — and the engine knows nothing about ducks: adding a
 * character means dropping a file here and importing it below.
 *
 * Parsing is strict for the same reason the message catalogue's is: this is
 * our own data, so a malformed character should fail a test, not ship and
 * render garbage. The one thing the parser cannot check is colour — palette
 * keys live in the themes — so a test covers that instead.
 */

import type { SpriteGrid, SpritePatch } from "./types";
import type { Behavior } from "./behaviors";
import bug from "./characters/bug.json";
import coffee from "./characters/coffee.json";
import duck from "./characters/duck.json";
import ninja from "./characters/ninja.json";
import pill from "./characters/pill.json";
import spark from "./characters/spark.json";
import tentacat from "./characters/tentacat.json";
import terminal from "./characters/terminal.json";

/** How the mascot is feeling. Drives which behaviours it can pick from. */
export const PET_STATES = ["idle", "focus", "rest", "celebrate", "sleepy"] as const;

export type PetState = (typeof PET_STATES)[number];

export interface PetFrame {
  readonly patches: readonly SpritePatch[];
  /** Vertical bob in sprite pixels — this is the whole "breathing" effect. */
  readonly offsetY: number;
  /** Sideways shift in sprite pixels, for shuffling about. */
  readonly offsetX?: number;
  readonly durationMs: number;
}

/** Tallest bob any animation uses; the canvas reserves this much headroom. */
export const MAX_BOB = 2;

/** Furthest a character may wander either way; the canvas reserves this much. */
export const MAX_SHIFT = 3;

/** Longest a single frame may hold. Anything stiller reads as frozen. */
const MAX_FRAME_MS = 2_000;

export interface Character {
  readonly id: string;
  readonly name: string;
  /** Short chip text for the settings panel. */
  readonly label: string;
  readonly hint: string;
  readonly size: number;
  readonly base: SpriteGrid;
  readonly behaviors: readonly Behavior[];
}

export const CHARACTERS: readonly Character[] = parseRegistry([
  duck,
  ninja,
  pill,
  terminal,
  spark,
  tentacat,
  bug,
  coffee,
]);

export function parseRegistry(raw: readonly unknown[]): readonly Character[] {
  const characters = raw.map((entry) => parseCharacter(entry));
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  for (const character of characters) {
    // A repeated id makes `getCharacter` always return the first match and
    // silently strands the later one; a repeated label leaves two settings
    // chips that look identical and only one of them clickable.
    if (seenIds.has(character.id)) {
      throw new Error(`duplicate character id "${character.id}"`);
    }
    if (seenLabels.has(character.label)) {
      throw new Error(`duplicate character label "${character.label}"`);
    }

    seenIds.add(character.id);
    seenLabels.add(character.label);
  }

  return characters;
}

export const CHARACTER_IDS = CHARACTERS.map((character) => character.id);

export const DEFAULT_CHARACTER_ID = "duck";

export function isCharacterId(value: unknown): value is string {
  return typeof value === "string" && CHARACTER_IDS.includes(value);
}

export function getCharacter(id: string): Character {
  const found = CHARACTERS.find((character) => character.id === id);
  if (!found) {
    throw new Error(`unknown character "${id}"`);
  }

  return found;
}

export function parseCharacter(value: unknown): Character {
  if (!isRecord(value)) {
    throw new Error("a character must be an object");
  }

  const id = text(value["id"], "character", "id");
  const name = text(value["name"], id, "name");
  const label = text(value["label"], id, "label");
  const hint = text(value["hint"], id, "hint");

  const size = value["size"];
  if (typeof size !== "number" || !Number.isInteger(size) || size < 8) {
    throw new Error(`character "${id}" needs an integer size of at least 8`);
  }

  const base = parseGrid(value["base"], id, size);
  const patches = parsePatches(value["patches"], id, size);
  const behaviors = parseBehaviors(value["behaviors"], id, patches);

  return { id, name, label, hint, size, base, behaviors };
}

function parseGrid(value: unknown, id: string, size: number): SpriteGrid {
  if (!Array.isArray(value) || value.length !== size) {
    throw new Error(`character "${id}" needs exactly ${size} rows`);
  }

  for (const row of value) {
    if (typeof row !== "string" || row.length !== size) {
      throw new Error(`character "${id}" has a row that is not ${size} pixels wide`);
    }
  }

  return value as SpriteGrid;
}

function parsePatches(
  value: unknown,
  id: string,
  size: number,
): ReadonlyMap<string, SpritePatch> {
  if (!isRecord(value)) {
    throw new Error(`character "${id}" needs a patches object`);
  }

  const patches = new Map<string, SpritePatch>();

  for (const [name, raw] of Object.entries(value)) {
    if (!isRecord(raw)) {
      throw new Error(`patch "${name}" of "${id}" is not an object`);
    }

    const { x, y } = raw;
    const rows = raw["rows"];

    if (!isCoordinate(x) || !isCoordinate(y)) {
      throw new Error(`patch "${name}" of "${id}" has a malformed anchor`);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`patch "${name}" of "${id}" has no rows`);
    }

    if (y + rows.length > size) {
      throw new Error(`patch "${name}" of "${id}" runs off the bottom of the grid`);
    }

    for (const row of rows) {
      if (typeof row !== "string" || row.length === 0) {
        throw new Error(`patch "${name}" of "${id}" has an empty row`);
      }

      if (x + row.length > size) {
        throw new Error(`patch "${name}" of "${id}" runs off the side of the grid`);
      }
    }

    patches.set(name, { x, y, rows: rows as SpriteGrid });
  }

  return patches;
}

function parseBehaviors(
  value: unknown,
  id: string,
  patches: ReadonlyMap<string, SpritePatch>,
): readonly Behavior[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`character "${id}" has no behaviours`);
  }

  const seen = new Set<string>();
  const behaviors = value.map((raw) => parseBehavior(raw, id, patches, seen));

  // A state with nothing to perform would freeze the mascot on screen.
  for (const state of PET_STATES) {
    const offered = behaviors.some((behavior) => (behavior.weights[state] ?? 0) > 0);
    if (!offered) {
      throw new Error(`character "${id}" has nothing to do while ${state}`);
    }
  }

  return behaviors;
}

function parseBehavior(
  value: unknown,
  id: string,
  patches: ReadonlyMap<string, SpritePatch>,
  seen: Set<string>,
): Behavior {
  if (!isRecord(value)) {
    throw new Error(`character "${id}" has a behaviour that is not an object`);
  }

  const behaviorId = text(value["id"], id, "behaviour id");
  if (seen.has(behaviorId)) {
    throw new Error(`character "${id}" declares "${behaviorId}" twice`);
  }
  seen.add(behaviorId);

  const loops = value["loops"];
  if (typeof loops !== "number" || !Number.isInteger(loops) || loops < 1) {
    throw new Error(`behaviour "${behaviorId}" of "${id}" needs at least one loop`);
  }

  const weights = parseWeights(value["weights"], id, behaviorId);
  const frames = parseFrames(value["frames"], id, behaviorId, patches);

  return { id: behaviorId, loops, weights, frames };
}

function parseWeights(
  value: unknown,
  id: string,
  behaviorId: string,
): Partial<Record<PetState, number>> {
  if (!isRecord(value)) {
    throw new Error(`behaviour "${behaviorId}" of "${id}" has no weights`);
  }

  const weights: Partial<Record<PetState, number>> = {};

  for (const [state, weight] of Object.entries(value)) {
    if (!PET_STATES.includes(state as PetState)) {
      throw new Error(`behaviour "${behaviorId}" of "${id}" names an unknown state`);
    }

    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
      throw new Error(`behaviour "${behaviorId}" of "${id}" has a weight that is not positive`);
    }

    weights[state as PetState] = weight;
  }

  return weights;
}

function parseFrames(
  value: unknown,
  id: string,
  behaviorId: string,
  patches: ReadonlyMap<string, SpritePatch>,
): readonly PetFrame[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`behaviour "${behaviorId}" of "${id}" has no frames`);
  }

  const frames = value.map((raw): PetFrame => {
    if (!isRecord(raw)) {
      throw new Error(`behaviour "${behaviorId}" of "${id}" has a frame that is not an object`);
    }

    const names = raw["patches"];
    if (!Array.isArray(names)) {
      throw new Error(`a frame of "${behaviorId}" in "${id}" has no patch list`);
    }

    const resolved = names.map((name) => {
      const patch = typeof name === "string" ? patches.get(name) : undefined;
      if (!patch) {
        throw new Error(`"${behaviorId}" of "${id}" references a patch that does not exist`);
      }

      return patch;
    });

    const durationMs = raw["durationMs"];
    if (
      typeof durationMs !== "number" ||
      !(durationMs > 0) ||
      durationMs > MAX_FRAME_MS
    ) {
      throw new Error(`a frame of "${behaviorId}" in "${id}" holds for a bad duration`);
    }

    const offsetY = raw["offsetY"];
    if (typeof offsetY !== "number" || !Number.isInteger(offsetY) || offsetY < 0 || offsetY > MAX_BOB) {
      throw new Error(`a frame of "${behaviorId}" in "${id}" bobs outside 0..${MAX_BOB}`);
    }

    const offsetX = raw["offsetX"];
    if (offsetX !== undefined) {
      if (typeof offsetX !== "number" || !Number.isInteger(offsetX) || Math.abs(offsetX) > MAX_SHIFT) {
        throw new Error(`a frame of "${behaviorId}" in "${id}" wanders past ${MAX_SHIFT}`);
      }
    }

    return {
      patches: resolved,
      offsetY,
      durationMs,
      ...(offsetX !== undefined ? { offsetX } : {}),
    };
  });

  // A performance that ends off-centre would drift further every time.
  const last = frames[frames.length - 1];
  if ((last?.offsetX ?? 0) !== 0) {
    throw new Error(`behaviour "${behaviorId}" of "${id}" does not walk back to centre`);
  }

  return frames;
}

function text(value: unknown, owner: string, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${owner} has no ${field}`);
  }

  return value;
}

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
