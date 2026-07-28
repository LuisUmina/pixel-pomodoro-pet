/**
 * Chiptune blips synthesised on the fly — square waves, no audio files.
 */

type Note = readonly [frequencyHz: number, seconds: number];

export const CHIMES = {
  /** Short confirmation when a phase starts. */
  start: [[660, 0.06], [880, 0.09]],
  /** Level-up flourish when a focus session runs out. */
  focusDone: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.22]],
  /** Softer descent when a break ends. */
  breakDone: [[784, 0.09], [587, 0.16]],
} as const satisfies Record<string, readonly Note[]>;

export type ChimeName = keyof typeof CHIMES;

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  // Created on first use: browsers only allow this after a user gesture.
  context ??= typeof AudioContext === "undefined" ? null : new AudioContext();

  if (context?.state === "suspended") {
    void context.resume();
  }

  return context;
}

export function playChime(name: ChimeName, volume = 0.14): void {
  const ctx = audioContext();
  if (!ctx) {
    return;
  }

  let startAt = ctx.currentTime;

  for (const [frequency, duration] of CHIMES[name]) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, startAt);

    // Exponential ramps from a tiny value avoid the click a hard cut makes.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);

    startAt += duration;
  }
}
