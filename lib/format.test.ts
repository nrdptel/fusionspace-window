import { describe, it, expect } from "vitest";
import {
  clock,
  clockCompact,
  clockShort,
  dayLabel,
  isStale,
  parseNaive,
  relativeAge,
  shortDate,
} from "./format";

describe("parseNaive", () => {
  it("reads date-time and date-only stamps", () => {
    expect(parseNaive("2026-06-27T13:05")).toMatchObject({ hour: 13, minute: 5, day: 27 });
    expect(parseNaive("2026-06-27")).toMatchObject({ hour: 0, minute: 0 });
    expect(parseNaive("nonsense")).toBeNull();
  });
});

describe("clock", () => {
  it("formats a 12-hour clock", () => {
    expect(clock("2026-06-27T13:05")).toBe("1:05 PM");
    expect(clock("2026-06-27T00:00")).toBe("12:00 AM");
    expect(clockShort("2026-06-27T13:00")).toBe("1 PM");
    expect(clockShort("2026-06-27T00:00")).toBe("12 AM");
  });
  it("formats an ultra-compact hour", () => {
    expect(clockCompact("2026-06-27T06:00")).toBe("6a");
    expect(clockCompact("2026-06-27T12:00")).toBe("12p");
    expect(clockCompact("2026-06-27T00:00")).toBe("12a");
    expect(clockCompact("2026-06-27T13:00")).toBe("1p");
  });
});

describe("dayLabel & shortDate", () => {
  it("labels today, tomorrow, then weekday", () => {
    expect(dayLabel("2026-06-27", "2026-06-27")).toBe("Today");
    expect(dayLabel("2026-06-28", "2026-06-27")).toBe("Tomorrow");
    expect(dayLabel("2026-06-30", "2026-06-27")).toBe("Tue");
    expect(shortDate("2026-06-27")).toBe("Jun 27");
  });
});

describe("relativeAge & isStale", () => {
  const t0 = 1_700_000_000_000;
  it("describes the age coarsely", () => {
    expect(relativeAge(t0, t0 + 30_000)).toBe("just now");
    expect(relativeAge(t0, t0 + 5 * 60_000)).toBe("5 min ago");
    expect(relativeAge(t0, t0 + 2 * 3_600_000)).toBe("2 h ago");
    expect(relativeAge(t0, t0 + 2 * 86_400_000)).toBe("2 d ago");
  });
  it("returns a dash for an unparseable timestamp instead of NaN", () => {
    expect(relativeAge(Date.parse("not-a-date"), t0)).toBe("—");
    expect(relativeAge(t0, NaN)).toBe("—");
  });
  it("flags data past the freshness window", () => {
    expect(isStale(t0, t0 + 60_000)).toBe(false);
    expect(isStale(t0, t0 + 20 * 60_000)).toBe(true);
  });
});
