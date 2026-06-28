import { describe, it, expect } from "vitest";
import forecastFixture from "./__fixtures__/forecast.json";
import { parseForecast, type RawForecast } from "./forecast";
import { findCalmWindows } from "./windows";
import type { HourPoint } from "./model";

const fc = parseForecast(forecastFixture as unknown as RawForecast, "gfs_seamless");

// Build a tiny hand-made hourly series to test the run-finding precisely.
function hp(time: string, windMph: number, isDay: boolean, gustMph = windMph * 1.4): HourPoint {
  return {
    time,
    tempF: 70,
    windMph,
    gustMph,
    dirDeg: 270,
    precipProbPct: 0,
    precipIn: 0,
    cloudCoverPct: 0,
    weatherCode: 0,
    isDay,
  };
}

describe("findCalmWindows", () => {
  it("finds maximal runs at or below the limit and skips the windy stretch", () => {
    const hours = [
      hp("2026-06-27T00:00", 8, false),
      hp("2026-06-27T01:00", 9, false),
      hp("2026-06-27T02:00", 25, false), // windy — breaks the run
      hp("2026-06-27T03:00", 7, true),
      hp("2026-06-27T04:00", 6, true),
      hp("2026-06-27T05:00", 5, true),
    ];
    const w = findCalmWindows(hours, { limitMph: 20, fromIndex: 0 });
    expect(w).toHaveLength(2);
    expect(w[0]).toMatchObject({ startIndex: 0, endIndex: 1, hours: 2 });
    expect(w[1]).toMatchObject({ startIndex: 3, endIndex: 5, hours: 3 });
    expect(w[1].maxWindMph).toBe(7);
    expect(w[1].daylight).toBe(true);
    expect(w[0].daylight).toBe(false);
  });

  it("respects fromIndex and the horizon", () => {
    const hours = Array.from({ length: 10 }, (_, i) => hp(`2026-06-27T${String(i).padStart(2, "0")}:00`, 5, true));
    const w = findCalmWindows(hours, { limitMph: 20, fromIndex: 4, horizonHours: 3 });
    expect(w).toHaveLength(1);
    expect(w[0].startIndex).toBe(4);
    expect(w[0].endIndex).toBe(6); // 4,5,6 — the 3-hour horizon
  });

  it("tightens as the personal line drops", () => {
    const wide = findCalmWindows(fc.hourly, { limitMph: 20, fromIndex: 0 });
    const tight = findCalmWindows(fc.hourly, { limitMph: 10, fromIndex: 0 });
    const totalHours = (ws: ReturnType<typeof findCalmWindows>) => ws.reduce((a, w) => a + w.hours, 0);
    // A lower line can only ever cover fewer (or equal) calm hours.
    expect(totalHours(tight)).toBeLessThanOrEqual(totalHours(wide));
    // The fixture's midday peak (22 mph) is excluded even at the 20 mph line.
    for (const w of wide) expect(w.maxWindMph).toBeLessThanOrEqual(20);
  });

  it("returns nothing when the whole horizon is over the limit", () => {
    const hours = Array.from({ length: 6 }, (_, i) => hp(`2026-06-27T${String(i).padStart(2, "0")}:00`, 30, true));
    expect(findCalmWindows(hours, { limitMph: 20, fromIndex: 0 })).toEqual([]);
  });
});
