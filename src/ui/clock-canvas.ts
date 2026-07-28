import { FONT_HEIGHT, drawText, measureText } from "./pixel-text";

/** Screen pixels per font pixel, before device pixel ratio. */
const SCALE = 6;

/** Glow radius, in font pixels, around the digits. */
const GLOW = 1.2;

/** Draws the countdown with the pixel font, so it scales without blurring. */
export class ClockCanvas {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;

  #signature = "";
  #resolution = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("could not acquire a 2d context for the clock");
    }

    this.#canvas = canvas;
    this.#ctx = ctx;
  }

  /** Extra backing-store resolution for when the widget is scaled up. */
  setResolution(multiplier: number): void {
    if (multiplier === this.#resolution) {
      return;
    }

    this.#resolution = multiplier;
    this.#signature = "";
  }

  render(text: string, color: string): void {
    const layout = (window.devicePixelRatio || 1) * this.#resolution;
    // Whole device pixels per font pixel, or the digits lose their hard edges.
    const pixel = Math.max(1, Math.round(SCALE * layout));

    const signature = `${text}|${color}|${pixel}`;
    if (signature === this.#signature) {
      return;
    }
    this.#signature = signature;

    const width = measureText(text) * pixel;
    const height = FONT_HEIGHT * pixel;

    this.#canvas.width = width;
    this.#canvas.height = height;

    // One backing pixel per device pixel — see PetCanvas for why.
    this.#canvas.style.width = `${width / layout}px`;
    this.#canvas.style.height = `${height / layout}px`;

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#ctx.shadowColor = color;
    this.#ctx.shadowBlur = GLOW * pixel;

    drawText(this.#ctx, text, color, { scale: pixel, x: 0, y: 0 });

    this.#ctx.shadowBlur = 0;
  }
}
