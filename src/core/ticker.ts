/**
 * Wall-clock ticker.
 *
 * It reports the time that actually passed between ticks rather than assuming
 * the interval fired on schedule, so a throttled webview or a suspended laptop
 * cannot make the timer drift.
 */
export class Ticker {
  #handle: ReturnType<typeof setInterval> | null = null;
  #last = 0;

  constructor(
    private readonly onTick: (elapsedMs: number) => void,
    private readonly intervalMs = 250,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get running(): boolean {
    return this.#handle !== null;
  }

  start(): void {
    if (this.#handle !== null) {
      return;
    }

    this.#last = this.now();
    this.#handle = setInterval(() => {
      const current = this.now();
      const elapsed = current - this.#last;
      this.#last = current;

      if (elapsed > 0) {
        this.onTick(elapsed);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.#handle === null) {
      return;
    }

    clearInterval(this.#handle);
    this.#handle = null;
  }
}
