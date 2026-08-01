/**
 * Chooses what a character does with itself between events.
 *
 * A single looping animation per mood reads as a machine within about a
 * minute of watching it. Instead each mood offers several short behaviours,
 * weighted, and one is drawn at the end of every performance.
 *
 * Picking is a pure function with the die passed in, because "does this look
 * random or does it look like a loop" is otherwise only answerable by staring
 * at the thing for ten minutes. The behaviours themselves are data — they
 * live in each character's JSON and arrive parsed via the registry.
 */

import type { PetFrame, PetState } from "./characters";

export interface Behavior {
  readonly id: string;
  readonly frames: readonly PetFrame[];
  /** Times the frames run before another behaviour is drawn. */
  readonly loops: number;
  /** Relative likelihood per mood. A mood left out is never offered it. */
  readonly weights: Partial<Record<PetState, number>>;
}

/**
 * Draws the next behaviour for a mood.
 *
 * `last` is avoided whenever the mood has anything else on offer, because
 * the same behaviour twice running is exactly what a loop looks like. Returns
 * null only if a mood has no behaviours at all, which the parser rules out
 * for every bundled character.
 */
export function pickBehavior(
  state: PetState,
  last: string | undefined,
  roll: number,
  behaviors: readonly Behavior[],
): Behavior | null {
  const offered = behaviors.filter((behavior) => (behavior.weights[state] ?? 0) > 0);
  if (offered.length === 0) {
    return null;
  }

  const fresh = offered.filter((behavior) => behavior.id !== last);
  const pool = fresh.length > 0 ? fresh : offered;

  const total = pool.reduce((sum, behavior) => sum + (behavior.weights[state] ?? 0), 0);
  let ticket = clamp(roll) * total;

  for (const behavior of pool) {
    ticket -= behavior.weights[state] ?? 0;
    if (ticket < 0) {
      return behavior;
    }
  }

  // A roll of exactly 1 spends the whole ticket without ever going negative,
  // and lands here. Shaving the roll instead would make any behaviour weighted
  // below the shaved amount unreachable.
  return pool[pool.length - 1] ?? null;
}

/** Garbage in means the first bucket, which at least is deterministic. */
function clamp(roll: number): number {
  return Number.isFinite(roll) && roll > 0 ? Math.min(roll, 1) : 0;
}
