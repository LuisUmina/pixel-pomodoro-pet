/**
 * Fades the widget once a session is underway and the pointer has left it.
 *
 * An always-on-top window that stays at full opacity becomes unbearable within
 * the hour, so the default is to get out of the way and come back on hover.
 */
export const POINTER_MOVE_THROTTLE_MS = 250;

/**
 * While already awake, pointermove is a 60–120 Hz stream of no-ops. Skip
 * until the throttle elapses. A dimmed widget always wakes on the first move.
 */
export function shouldSkipPointerMoveWake(
  dimmed: boolean,
  now: number,
  lastWakeAt: number,
  throttleMs = POINTER_MOVE_THROTTLE_MS,
): boolean {
  return !dimmed && now - lastWakeAt < throttleMs;
}

export class AutoDim {
  #timer: ReturnType<typeof setTimeout> | null = null;
  #enabled = false;
  #dimmed = false;
  #lastWakeAt = 0;

  constructor(
    private readonly element: HTMLElement,
    private readonly delayMs = 6_000,
  ) {
    const wake = (): void => this.wake();

    this.element.addEventListener("pointerenter", wake);
    this.element.addEventListener("pointermove", () => {
      if (shouldSkipPointerMoveWake(this.#dimmed, Date.now(), this.#lastWakeAt)) {
        return;
      }
      this.wake();
    });
    this.element.addEventListener("pointerdown", wake);
    window.addEventListener("focus", wake);
  }

  /** Dimming only ever happens while the timer is actually running. */
  setEnabled(enabled: boolean): void {
    if (enabled === this.#enabled) {
      return;
    }

    this.#enabled = enabled;
    this.wake();
  }

  /**
   * Brings the widget back to full opacity and restarts the countdown.
   *
   * Public because the mascot speaking is exactly the moment you want to be
   * able to read it, dimmed or not.
   */
  wake(): void {
    this.#lastWakeAt = Date.now();
    if (this.#dimmed) {
      this.#dimmed = false;
      this.element.classList.remove("is-dimmed");
    }
    this.#clear();

    if (this.#enabled) {
      this.#timer = setTimeout(() => {
        this.#dimmed = true;
        this.element.classList.add("is-dimmed");
      }, this.delayMs);
    }
  }

  #clear(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}
