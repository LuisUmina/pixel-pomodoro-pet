/**
 * Fades the widget once a session is underway and the pointer has left it.
 *
 * An always-on-top window that stays at full opacity becomes unbearable within
 * the hour, so the default is to get out of the way and come back on hover.
 */
export class AutoDim {
  #timer: ReturnType<typeof setTimeout> | null = null;
  #enabled = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly delayMs = 6_000,
  ) {
    const wake = (): void => this.#wake();

    this.element.addEventListener("pointerenter", wake);
    this.element.addEventListener("pointermove", wake);
    this.element.addEventListener("pointerdown", wake);
    window.addEventListener("focus", wake);
  }

  /** Dimming only ever happens while the timer is actually running. */
  setEnabled(enabled: boolean): void {
    if (enabled === this.#enabled) {
      return;
    }

    this.#enabled = enabled;
    this.#wake();
  }

  #wake(): void {
    this.element.classList.remove("is-dimmed");
    this.#clear();

    if (this.#enabled) {
      this.#timer = setTimeout(() => {
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
