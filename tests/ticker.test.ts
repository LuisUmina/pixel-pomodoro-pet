import { afterEach, describe, expect, it, vi } from "vitest";
import { Ticker } from "../src/core/ticker";

afterEach(() => {
  vi.useRealTimers();
});

describe("Ticker", () => {
  it("does not start a second interval if it is already running", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const ticker = new Ticker(onTick, 250, () => Date.now());

    ticker.start();
    ticker.start();
    expect(ticker.running).toBe(true);

    vi.advanceTimersByTime(250);
    expect(onTick).toHaveBeenCalledTimes(1);

    ticker.stop();
  });

  it("stop() clears the interval so later time does not tick", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const ticker = new Ticker(onTick, 250, () => Date.now());

    ticker.start();
    vi.advanceTimersByTime(250);
    expect(onTick).toHaveBeenCalledTimes(1);

    ticker.stop();
    expect(ticker.running).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("can be started again after stop", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const ticker = new Ticker(onTick, 250, () => Date.now());

    ticker.start();
    vi.advanceTimersByTime(250);
    ticker.stop();
    ticker.start();
    vi.advanceTimersByTime(250);

    expect(onTick).toHaveBeenCalledTimes(2);
    ticker.stop();
  });
});
