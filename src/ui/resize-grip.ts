import { BASE_WIDGET_WIDTH, clampUiScale } from "../scale";

/**
 * Drag-to-resize handle for the bottom-right corner.
 *
 * A frameless window has no OS resize borders, so the widget grows its own.
 * Horizontal travel maps to the scale factor; dragging the width of the widget
 * doubles it.
 */
export class ResizeGrip {
  #startX = 0;
  #startScale = 1;
  #scale = 1;

  constructor(
    private readonly handle: HTMLElement,
    private readonly onPreview: (scale: number) => void,
    private readonly onCommit: (scale: number) => void,
  ) {
    this.handle.addEventListener("pointerdown", this.#onPointerDown);
  }

  /** Keeps the grip in step when the scale changes from the presets. */
  setScale(scale: number): void {
    this.#scale = scale;
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();

    // Screen coordinates, because the window itself moves under the pointer
    // while it resizes and client coordinates would drift with it.
    this.#startX = event.screenX;
    this.#startScale = this.#scale;

    this.handle.setPointerCapture(event.pointerId);
    this.handle.addEventListener("pointermove", this.#onPointerMove);
    this.handle.addEventListener("pointerup", this.#onPointerUp);
    this.handle.addEventListener("pointercancel", this.#onPointerUp);
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const travel = (event.screenX - this.#startX) / BASE_WIDGET_WIDTH;
    this.#scale = clampUiScale(this.#startScale + travel);
    this.onPreview(this.#scale);
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    this.handle.releasePointerCapture(event.pointerId);
    this.handle.removeEventListener("pointermove", this.#onPointerMove);
    this.handle.removeEventListener("pointerup", this.#onPointerUp);
    this.handle.removeEventListener("pointercancel", this.#onPointerUp);

    // Only the settled value is worth persisting, not every frame of the drag.
    this.onCommit(this.#scale);
  };
}
