import data from "./duck.json";
import type { SpriteGrid, SpritePatch } from "./types";

/** The duck lives on a square grid of this many pixels per side. */
export const DUCK_SIZE: number = data.size;

export const DUCK_BASE: SpriteGrid = data.base;

export const PATCHES = data.patches;

/** How the mascot is feeling. Drives which behaviours it can pick from. */
export type PetState = "idle" | "focus" | "rest" | "celebrate" | "sleepy";

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

/** Furthest the duck may wander either way; the canvas reserves this much. */
export const MAX_SHIFT = 3;
