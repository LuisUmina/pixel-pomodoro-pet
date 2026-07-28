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

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("could not acquire a 2d context for the clock");
    }

    this.#canvas = canvas;
    this.#ctx = ctx;
  }

  render(text: string, color: string): void {
    const signature = `${text}|${color}|${window.devicePixelRatio}`;
    if (signature === this.#signature) {
      return;
    }
    this.#signature = signature;

    const ratio = window.devicePixelRatio || 1;
    const pixel = SCALE * ratio;
    const width = measureText(text);

    this.#canvas.style.width = `${width * SCALE}px`;
    this.#canvas.style.height = `${FONT_HEIGHT * SCALE}px`;
    this.#canvas.width = Math.round(width * pixel);
    this.#canvas.height = Math.round(FONT_HEIGHT * pixel);

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#ctx.shadowColor = color;
    this.#ctx.shadowBlur = GLOW * pixel;

    drawText(this.#ctx, text, color, { scale: pixel, x: 0, y: 0 });

    this.#ctx.shadowBlur = 0;
  }
}
