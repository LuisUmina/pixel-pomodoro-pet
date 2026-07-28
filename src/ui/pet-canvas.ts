import {
  DUCK_BASE,
  DUCK_SIZE,
  MAX_BOB,
  PET_ANIMATIONS,
  type PetState,
} from "../sprites/duck";
import { applyPatches, drawSprite } from "../sprites/renderer";
import type { SpritePalette } from "../sprites/types";

/** Screen pixels per sprite pixel, before device pixel ratio. */
const SCALE = 5;

/** Animates the mascot on its own canvas, independent of timer updates. */
export class PetCanvas {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;

  #palette: SpritePalette = {};
  #state: PetState = "idle";
  #frameIndex = 0;
  #frameElapsed = 0;
  #lastTimestamp = 0;
  #pixel = SCALE;
  #resolution = 1;
  #handle: number | null = null;
  #dirty = true;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("could not acquire a 2d context for the mascot");
    }

    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#resize();
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
    this.#frameIndex = 0;
    this.#frameElapsed = 0;
    this.#dirty = true;
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

    // Extra rows so the bob never clips the duck's feet.
    const width = DUCK_SIZE * this.#pixel;
    const height = (DUCK_SIZE + MAX_BOB) * this.#pixel;

    this.#canvas.width = width;
    this.#canvas.height = height;

    // Lay it out so one backing pixel lands on exactly one device pixel.
    // Sizing the element independently would make the browser resample the
    // art, which is what turns crisp blocks to mush at fractional scales.
    this.#canvas.style.width = `${width / layout}px`;
    this.#canvas.style.height = `${height / layout}px`;
  }

  readonly #step = (timestamp: number): void => {
    const frames = PET_ANIMATIONS[this.#state];
    const elapsed = this.#lastTimestamp === 0 ? 0 : timestamp - this.#lastTimestamp;
    this.#lastTimestamp = timestamp;
    this.#frameElapsed += elapsed;

    const current = frames[this.#frameIndex];
    if (current && this.#frameElapsed >= current.durationMs) {
      this.#frameElapsed = 0;
      this.#frameIndex = (this.#frameIndex + 1) % frames.length;
      this.#dirty = true;
    }

    // Repainting only on a frame change keeps this near-free between blinks.
    if (this.#dirty) {
      this.#draw();
      this.#dirty = false;
    }

    this.#handle = requestAnimationFrame(this.#step);
  };

  #draw(): void {
    const frames = PET_ANIMATIONS[this.#state];
    const frame = frames[this.#frameIndex] ?? frames[0];
    if (!frame) {
      return;
    }

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    drawSprite(this.#ctx, applyPatches(DUCK_BASE, frame.patches), this.#palette, {
      scale: this.#pixel,
      x: 0,
      y: frame.offsetY * this.#pixel,
    });
  }
}
