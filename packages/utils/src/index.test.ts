import { describe, expect, it } from "vitest";
import { calculateSlots, localDateTimeToUtc, rangesOverlap, slugify } from "./index";

describe("scheduling", () => {
  it("treats touching ranges as non-overlapping", () => expect(rangesOverlap({ start: new Date(0), end: new Date(10) }, { start: new Date(10), end: new Date(20) })).toBe(false));
  it("removes slots that overlap existing work", () => {
    const slots = calculateSlots({ window: { start: new Date(0), end: new Date(60 * 60_000) }, durationMinutes: 30, intervalMinutes: 15, unavailable: [{ start: new Date(15 * 60_000), end: new Date(45 * 60_000) }] });
    expect(slots).toHaveLength(0);
  });
  it("creates stable slugs", () => expect(slugify(" Northstar Dental Studio ")).toBe("northstar-dental-studio"));
  it("converts Manila clinic time to UTC", () => expect(localDateTimeToUtc("2026-09-03", 9 * 60, "Asia/Manila").toISOString()).toBe("2026-09-03T01:00:00.000Z"));
});
