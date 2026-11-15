import { describe, expect, it } from "vitest";

import { formatClock } from "../src/core/format";
import { miniDispatchNeedsResize, shouldSkipMiniResize } from "../src/core/mini-footprint";

describe("formatClock digit width around 100 minutes", () => {
  it("gains a character crossing 100:00", () => {
    expect(formatClock(100 * 60_000)).toBe("100:00");
    expect(formatClock(100 * 60_000).length).toBe(6);
    expect(formatClock(99 * 60_000 + 59_000)).toBe("99:59");
    expect(formatClock(99 * 60_000 + 59_000).length).toBe(5);
  });
});

describe("miniDispatchNeedsResize", () => {
  it("is false on a normal tick with no phase completion and same digit count", () => {
    expect(miniDispatchNeedsResize(undefined, 5, 5)).toBe(false);
  });

  it("is true when a phase completed even if the clock string length stayed put", () => {
    expect(miniDispatchNeedsResize("focus", 5, 5)).toBe(true);
  });

  it("is true when the clock gained or lost a digit", () => {
    expect(miniDispatchNeedsResize(undefined, 6, 5)).toBe(true);
    expect(miniDispatchNeedsResize(undefined, 5, 6)).toBe(true);
  });

  it("does not treat a missing completed field as a completion (`undefined !== null`)", () => {
    // The original dispatch check used `transition.completed !== null`, which
    // is true for every tick because completed is optional.
    expect(undefined !== null).toBe(true);
    expect(miniDispatchNeedsResize(undefined, 5, 5)).toBe(false);
  });
});

describe("shouldSkipMiniResize", () => {
  const last = { width: 120, height: 80 };

  it("never skips the first measurement or a forced sync", () => {
    expect(shouldSkipMiniResize(null, last, false)).toBe(false);
    expect(shouldSkipMiniResize(last, last, true)).toBe(false);
  });

  it("skips sub-pixel jitter", () => {
    expect(shouldSkipMiniResize(last, { width: 120.2, height: 80.1 }, false)).toBe(true);
  });

  it("does not skip a real footprint change", () => {
    expect(shouldSkipMiniResize(last, { width: 140, height: 80 }, false)).toBe(false);
    expect(shouldSkipMiniResize(last, { width: 120, height: 110 }, false)).toBe(false);
  });
});
