import data from "./duck.json";
import type { SpriteGrid, SpritePatch } from "./types";

/** The duck lives on a square grid of this many pixels per side. */
export const DUCK_SIZE: number = data.size;

export const DUCK_BASE: SpriteGrid = data.base;

const { blink, focusEyes, happyEyes, zNear, zFar, sparkleLeft, sparkleRight } = data.patches;

/** How the mascot is feeling. Drives which overlays get composed. */
export type PetState = "idle" | "focus" | "rest" | "celebrate" | "sleepy";

export interface PetFrame {
  readonly patches: readonly SpritePatch[];
  /** Vertical bob in sprite pixels — this is the whole "breathing" effect. */
  readonly offsetY: number;
  readonly durationMs: number;
}

/** Tallest bob any animation uses; the canvas reserves this much headroom. */
export const MAX_BOB = 2;

export const PET_ANIMATIONS: Readonly<Record<PetState, readonly PetFrame[]>> = {
  idle: [
    { patches: [], offsetY: 0, durationMs: 1700 },
    { patches: [blink], offsetY: 0, durationMs: 140 },
    { patches: [], offsetY: 1, durationMs: 1500 },
    { patches: [blink], offsetY: 1, durationMs: 140 },
  ],
  focus: [
    { patches: [focusEyes], offsetY: 0, durationMs: 900 },
    { patches: [focusEyes], offsetY: 1, durationMs: 900 },
    { patches: [focusEyes], offsetY: 1, durationMs: 900 },
    { patches: [blink], offsetY: 0, durationMs: 130 },
  ],
  rest: [
    { patches: [happyEyes], offsetY: 0, durationMs: 520 },
    { patches: [happyEyes], offsetY: 1, durationMs: 520 },
  ],
  celebrate: [
    { patches: [happyEyes, sparkleLeft], offsetY: 0, durationMs: 170 },
    { patches: [happyEyes, sparkleRight], offsetY: 2, durationMs: 170 },
    { patches: [happyEyes, sparkleLeft, sparkleRight], offsetY: 0, durationMs: 170 },
    { patches: [happyEyes], offsetY: 2, durationMs: 170 },
  ],
  sleepy: [
    { patches: [blink, zNear], offsetY: 0, durationMs: 850 },
    { patches: [blink, zNear, zFar], offsetY: 1, durationMs: 850 },
  ],
};
