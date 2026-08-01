import { pickBehavior, type Behavior } from "../sprites/behaviors";
import {
  DEFAULT_CHARACTER_ID,
  MAX_BOB,
  MAX_SHIFT,
  getCharacter,
  type Character,
  type PetState,
} from "../sprites/characters";
import { applyPatches, drawSprite } from "../sprites/renderer";
import type { SpritePalette } from "../sprites/types";

/** Screen pixels per sprite pixel, before device pixel ratio. */
const SCALE = 5;

/** Animates the mascot on its own canvas, independent of timer updates. */
export class PetCanvas {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;

  #character: Character;
  #palette: SpritePalette = {};
  #state: PetState = "idle";
  #behavior: Behavior | null = null;
  #frameIndex = 0;
  #frameElapsed = 0;
  #loopsDone = 0;
  #lastTimestamp = 0;
  #pixel = SCALE;
  #resolution = 1;
  #handle: number | null = null;
  #dirty = true;

  constructor(canvas: HTMLCanvasElement, character = getCharacter(DEFAULT_CHARACTER_ID)) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("could not acquire a 2d context for the mascot");
    }

    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#character = character;
    this.#nextBehavior();
    this.#resize();
  }

  setCharacter(character: Character): void {
    if (character.id === this.#character.id) {
      return;
    }

    this.#character = character;
    this.#behavior = null;
    this.#nextBehavior();
    this.#resize();
    this.#dirty = true;
  }

  setPalette(palette: SpritePalette): void {
    // Called on every render; only a real theme change is worth a repaint.
    if (palette === this.#palette) {
      return;
    }

    this.#palette = palette;
    this.#dirty = true;
  }

  /**
   * Extra backing-store resolution for when the widget is scaled up, so the
   * duck gains real pixels instead of being stretched.
   */
  setResolution(multiplier: number): void {
    if (multiplier === this.#resolution) {
      return;
    }

    this.#resolution = multiplier;
    this.#resize();
    this.#dirty = true;
  }

  setState(state: PetState): void {
    if (state === this.#state) {
      return;
    }

    this.#state = state;
    // A mood change interrupts whatever it was doing rather than waiting for
    // the current performance to finish — the duck reacts to you, not later.
    this.#nextBehavior();
    this.#dirty = true;
  }

  #nextBehavior(): void {
    const next = pickBehavior(
      this.#state,
      this.#behavior?.id,
      Math.random(),
      this.#character.behaviors,
    );
    if (next) {
      this.#behavior = next;
    }

    this.#frameIndex = 0;
    this.#frameElapsed = 0;
    this.#loopsDone = 0;
  }

  start(): void {
    if (this.#handle === null) {
      this.#handle = requestAnimationFrame(this.#step);
    }
  }

  stop(): void {
    if (this.#handle !== null) {
      cancelAnimationFrame(this.#handle);
      this.#handle = null;
      this.#lastTimestamp = 0;
    }
  }

  #resize(): void {
    const layout = (window.devicePixelRatio || 1) * this.#resolution;

    // A whole number of device pixels per sprite pixel: anything fractional
    // would leave the blocks with soft, uneven edges.
    this.#pixel = Math.max(1, Math.round(SCALE * layout));

    // Room for the bob below and for a wander either side, so neither clips.
    const width = (this.#character.size + MAX_SHIFT * 2) * this.#pixel;
    const height = (this.#character.size + MAX_BOB) * this.#pixel;

    this.#canvas.width = width;
    this.#canvas.height = height;

    // Lay it out so one backing pixel lands on exactly one device pixel.
    // Sizing the element independently would make the browser resample the
    // art, which is what turns crisp blocks to mush at fractional scales.
    this.#canvas.style.width = `${width / layout}px`;
    this.#canvas.style.height = `${height / layout}px`;
  }

  readonly #step = (timestamp: number): void => {
    const frames = this.#behavior?.frames ?? [];
    const elapsed = this.#lastTimestamp === 0 ? 0 : timestamp - this.#lastTimestamp;
    this.#lastTimestamp = timestamp;
    this.#frameElapsed += elapsed;

    const current = frames[this.#frameIndex];
    if (current && this.#frameElapsed >= current.durationMs) {
      this.#frameElapsed = 0;
      this.#frameIndex += 1;
      this.#dirty = true;

      if (this.#frameIndex >= frames.length) {
        this.#frameIndex = 0;
        this.#loopsDone += 1;

        // Performance over: draw again rather than repeating on a loop.
        if (this.#loopsDone >= (this.#behavior?.loops ?? 1)) {
          this.#nextBehavior();
        }
      }
    }

    // Repainting only on a frame change keeps this near-free between blinks.
    if (this.#dirty) {
      this.#draw();
      this.#dirty = false;
    }

    this.#handle = requestAnimationFrame(this.#step);
  };

  #draw(): void {
    const frames = this.#behavior?.frames ?? [];
    const frame = frames[this.#frameIndex] ?? frames[0];
    if (!frame) {
      return;
    }

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    drawSprite(this.#ctx, applyPatches(this.#character.base, frame.patches), this.#palette, {
      scale: this.#pixel,
      // The character sits mid-strip and walks from there.
      x: (MAX_SHIFT + (frame.offsetX ?? 0)) * this.#pixel,
      y: frame.offsetY * this.#pixel,
    });
  }
}
