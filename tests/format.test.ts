import { describe, expect, it } from "vitest";

import { isoDay } from "../src/core/format";

describe("isoDay", () => {
  it("pads month and day to two digits", () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("pads the year to four digits too", () => {
    // store/history.ts validates a stored day by round-tripping it through
    // this function; an unpadded year would never match its own input.
    // Years below 100 are skipped here: `new Date(year, ...)` remaps a
    // two-digit year to 19xx by long-standing JS convention, which is a
    // platform quirk unrelated to what this is actually checking.
    expect(isoDay(new Date(500, 5, 15))).toBe("0500-06-15");
    expect(isoDay(new Date(100, 0, 1))).toBe("0100-01-01");
  });
});
