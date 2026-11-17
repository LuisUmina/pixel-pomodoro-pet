import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AutoDim,
  POINTER_MOVE_THROTTLE_MS,
  shouldSkipPointerMoveWake,
} from "../src/ui/auto-dim";

describe("shouldSkipPointerMoveWake", () => {
  it("never skips when the widget is dimmed", () => {
    expect(shouldSkipPointerMoveWake(true, 1_000, 999)).toBe(false);
  });

  it("skips awake moves inside the throttle window", () => {
    expect(shouldSkipPointerMoveWake(false, 1_000, 1_000)).toBe(true);
    expect(shouldSkipPointerMoveWake(false, 1_000 + POINTER_MOVE_THROTTLE_MS - 1, 1_000)).toBe(
      true,
    );
  });

  it("allows a wake once the throttle has elapsed", () => {
    expect(shouldSkipPointerMoveWake(false, 1_000 + POINTER_MOVE_THROTTLE_MS, 1_000)).toBe(false);
  });
});

describe("AutoDim", () => {
  type Handler = () => void;
  const listeners: Record<string, Handler[]> = {};
  const classList = {
    add: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    for (const key of Object.keys(listeners)) {
      delete listeners[key];
    }
    classList.add.mockReset();
    classList.remove.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.stubGlobal("window", {
      addEventListener(type: string, fn: Handler) {
        (listeners[`window:${type}`] ??= []).push(fn);
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function attach() {
    const element = {
      classList,
      addEventListener(type: string, fn: Handler) {
        (listeners[type] ??= []).push(fn);
      },
    } as unknown as HTMLElement;
    const dim = new AutoDim(element, 1_000);
    return dim;
  }

  it("does not remove is-dimmed or churn the timer on a burst of awake pointermoves", () => {
    const dim = attach();
    dim.setEnabled(true);
    classList.remove.mockClear();

    for (let i = 0; i < 40; i += 1) {
      vi.setSystemTime(i * 5);
      listeners["pointermove"]?.forEach((fn) => fn());
    }

    expect(classList.remove).not.toHaveBeenCalled();
    expect(classList.add).not.toHaveBeenCalled();
  });

  it("dims after the delay, then undims on the first pointermove", () => {
    const dim = attach();
    dim.setEnabled(true);

    vi.advanceTimersByTime(1_000);
    expect(classList.add).toHaveBeenCalledWith("is-dimmed");

    classList.remove.mockClear();
    listeners["pointermove"]?.forEach((fn) => fn());
    expect(classList.remove).toHaveBeenCalledTimes(1);
    expect(classList.remove).toHaveBeenCalledWith("is-dimmed");
  });

  it("pointerenter always wakes, even inside the throttle window", () => {
    const dim = attach();
    dim.setEnabled(true);
    vi.advanceTimersByTime(1_000);
    classList.remove.mockClear();

    vi.setSystemTime(1_000);
    listeners["pointerenter"]?.forEach((fn) => fn());
    expect(classList.remove).toHaveBeenCalledWith("is-dimmed");
  });
});
