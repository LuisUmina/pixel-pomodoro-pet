/**
 * The speech bubble over the mascot.
 *
 * Text is revealed a character at a time, which suits the terminal look and
 * costs nothing. The box is a fixed size so the reveal never reflows it — the
 * catalogue caps line length for exactly this reason.
 */

/** Milliseconds per character, and the ceiling on the whole reveal. */
const REVEAL_STEP_MS = 24;
const MAX_REVEAL_MS = 850;

/** How long a finished line stays up, scaled to how much there is to read. */
const MIN_HOLD_MS = 2_600;
const HOLD_PER_CHAR_MS = 55;
const MAX_HOLD_MS = 7_000;

/** Must match the opacity transition in the stylesheet. */
const FADE_MS = 180;

export interface BubbleOptions {
  /** Fires when the bubble appears and again when it leaves. */
  readonly onChange?: (visible: boolean) => void;
}

export class Bubble {
  readonly #root: HTMLElement;
  readonly #text: HTMLElement;
  readonly #onChange: (visible: boolean) => void;

  #reveal: ReturnType<typeof setInterval> | null = null;
  #hold: ReturnType<typeof setTimeout> | null = null;
  #hide: ReturnType<typeof setTimeout> | null = null;
  #visible = false;

  constructor(root: HTMLElement, text: HTMLElement, options: BubbleOptions = {}) {
    this.#root = root;
    this.#text = text;
    this.#onChange = options.onChange ?? ((): void => {});

    // Anything the mascot says can be waved away immediately.
    this.#root.addEventListener("click", () => this.dismiss());
  }

  get isVisible(): boolean {
    return this.#visible;
  }

  say(message: string): void {
    if (message === "") {
      return;
    }

    this.#stopTimers();
    this.#text.textContent = "";
    this.#show();

    const step = Math.min(REVEAL_STEP_MS, MAX_REVEAL_MS / message.length);
    let shown = 0;

    this.#reveal = setInterval(() => {
      shown += 1;
      this.#text.textContent = message.slice(0, shown);

      if (shown >= message.length) {
        this.#stopReveal();
        this.#hold = setTimeout(() => this.dismiss(), holdFor(message));
      }
    }, step);
  }

  dismiss(): void {
    this.#stopTimers();

    if (!this.#visible) {
      return;
    }

    this.#visible = false;
    this.#root.dataset["shown"] = "false";
    this.#onChange(false);

    // Stays in the tree for the fade, then leaves so it takes no more clicks.
    this.#hide = setTimeout(() => {
      this.#root.hidden = true;
    }, FADE_MS);
  }

  #show(): void {
    this.#root.hidden = false;

    // Flush layout so the transition has a start value to move away from.
    // Deferring to a frame would read better, but a widget that spends its
    // life unfocused cannot count on rAF running when it is asked to.
    void this.#root.offsetHeight;
    this.#root.dataset["shown"] = "true";

    if (!this.#visible) {
      this.#visible = true;
      this.#onChange(true);
    }
  }

  #stopTimers(): void {
    this.#stopReveal();

    if (this.#hold !== null) {
      clearTimeout(this.#hold);
      this.#hold = null;
    }

    if (this.#hide !== null) {
      clearTimeout(this.#hide);
      this.#hide = null;
    }
  }

  #stopReveal(): void {
    if (this.#reveal !== null) {
      clearInterval(this.#reveal);
      this.#reveal = null;
    }
  }
}

function holdFor(message: string): number {
  const scaled = MIN_HOLD_MS + message.length * HOLD_PER_CHAR_MS;
  return Math.min(MAX_HOLD_MS, scaled);
}
