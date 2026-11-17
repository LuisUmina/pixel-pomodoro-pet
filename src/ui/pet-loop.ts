/**
 * Pure cursor for the mascot animation. PetCanvas used to poll this 60–144
 * times a second via rAF; now it only advances when a sprite frame's
 * `durationMs` elapses. Keeping the wrap/loop math here means the timer
 * loop and the old rAF loop cannot drift apart in tests.
 */
export interface PetLoopCursor {
  readonly frameIndex: number;
  readonly loopsDone: number;
  /** True when this advance exhausted the behaviour and a new one should be drawn. */
  readonly pickNextBehavior: boolean;
}

export function advancePetLoopCursor(
  frameIndex: number,
  frameCount: number,
  loopsDone: number,
  loops: number,
): PetLoopCursor {
  let nextIndex = frameIndex + 1;
  let nextLoops = loopsDone;
  let pickNextBehavior = false;

  if (frameCount <= 0) {
    return { frameIndex: 0, loopsDone, pickNextBehavior: false };
  }

  if (nextIndex >= frameCount) {
    nextIndex = 0;
    nextLoops += 1;
    if (nextLoops >= loops) {
      pickNextBehavior = true;
    }
  }

  return { frameIndex: nextIndex, loopsDone: nextLoops, pickNextBehavior };
}

/** The loop only paints and schedules while the widget is running and visible. */
export function petLoopShouldRun(running: boolean, hidden: boolean): boolean {
  return running && !hidden;
}
