import { describe, it, expect } from "vitest";
import forecastFixture from "./__fixtures__/forecast.json";
import { parseForecast, heightToFeet, visibilityToMiles, type RawForecast } from "./forecast";
import { FT_PER_M } from "../units";

const raw = forecastFixture as unknown as RawForecast;

// Open-Meteo returns length variables (visibility, freezing level, geopotential height) in
// FEET when imperial wind/temperature units are requested — which is how the app asks. The
// fixture mirrors that, and these conversions are tested both ways so a regression in either
// the feet path (production) or the metres path (a model that reports SI) is caught.
describe("heightToFeet", () => {
  it("passes feet through and converts metres", () => {
    expect(heightToFeet(1000, "ft")).toBe(1000);
    expect(heightToFeet(1000, "feet")).toBe(1000);
    expect(heightToFeet(100, "m")).toBeCloseTo(328.08, 1);
    // Unknown/missing unit defaults to metres (Open-Meteo's documented default).
    expect(heightToFeet(100, undefined)).toBeCloseTo(328.08, 1);
  });
});

describe("visibilityToMiles", () => {
  it("converts feet (the imperial-request unit) and metres to statute miles", () => {
    expect(visibilityToMiles(52800, "ft")).toBeCloseTo(10, 4); // 52,800 ft = 10 mi
    expect(visibilityToMiles(16093.44, "m")).toBeCloseTo(10, 4); // 16,093.44 m = 10 mi
    expect(visibilityToMiles(5, "mi")).toBe(5);
    // Unknown/missing unit defaults to metres.
    expect(visibilityToMiles(1609.344, undefined)).toBeCloseTo(1, 4);
  });
});

describe("parseForecast", () => {
  const fc = parseForecast(raw, "gfs_seamless", "Test Field");

  it("carries the field, elevation (m→ft), and label", () => {
    expect(fc.field.label).toBe("Test Field");
    expect(fc.field.lat).toBe(34.45);
    expect(fc.field.elevationFt).toBeCloseTo(900 * FT_PER_M, 2);
    expect(fc.model).toBe("gfs_seamless");
  });

  it("reads current conditions verbatim from the response", () => {
    expect(fc.current.windMph).toBe(21);
    expect(fc.current.dirDeg).toBe(255);
    expect(fc.current.tempF).toBe(79);
    expect(fc.current.isDay).toBe(true);
    expect(fc.current.cloudCoverPct).toBe(20);
  });

  it("mirrors hourly and daily arrays one-for-one", () => {
    expect(fc.hourly).toHaveLength(raw.hourly!.time.length);
    expect(fc.daily).toHaveLength(raw.daily!.time.length);
    expect(fc.hourly[12].windMph).toBe(raw.hourly!.wind_speed_10m![12]);
    expect(fc.hourly[6].windMph).toBe(7); // the morning calm window
    expect(fc.daily[0].tempMaxF).toBe(raw.daily!.temperature_2m_max![0]);
  });

  it("builds one aloft profile per hour", () => {
    expect(fc.aloftHourly).toHaveLength(fc.hourly.length);
    expect(fc.aloftHourly[0].time).toBe(fc.hourly[0].time);
  });

  it("converts hourly visibility (feet, per the imperial request) to statute miles", () => {
    // Fixture: overnight haze ~10 mi (52,800 ft), clear ~50 mi (264,000 ft) by day.
    expect(fc.hourly[0].visibilityMi).toBeCloseTo(10, 2);
    expect(fc.hourly[12].visibilityMi).toBeCloseTo(50, 2);
    expect(fc.hourly[12].visibilityMi).toBeGreaterThan(fc.hourly[0].visibilityMi);
  });

  it("expresses the 0°C freezing level (feet MSL) as height above the field", () => {
    // Fixture: 14,763.78 ft MSL (≈4,500 m), field ≈2,953 ft → ~11,811 ft AGL.
    expect(fc.aloftHourly[0].freezingLevelAglFt).toBeCloseTo((4500 - 900) * FT_PER_M, 0);
  });

  it("drops a below-field freezing level to NaN", () => {
    const cold = {
      ...raw,
      hourly: { ...raw.hourly, freezing_level_height: raw.hourly!.time.map(() => 100) },
    } as RawForecast;
    const fcc = parseForecast(cold, "gfs_seamless");
    // 100 ft MSL is below the ~2,953 ft field — no line to draw.
    expect(Number.isNaN(fcc.aloftHourly[0].freezingLevelAglFt)).toBe(true);
  });

  it("derives true AGL as geopotential height minus field elevation", () => {
    const levels = fc.aloftHourly[0].levels;
    const l500 = levels.find((l) => l.pressureHpa === 500)!;
    // Fixture reports geopotential in feet, so AGL = ghFt - elevationFt directly.
    expect(l500.mslFt).toBe(18300);
    expect(l500.aglFt).toBeCloseTo(18300 - 900 * FT_PER_M, 1);
  });

  it("drops pressure levels below the field and sorts the rest by height", () => {
    const levels = fc.aloftHourly[0].levels;
    // 925 hPa (2600 ft MSL) is below the ~2953 ft field — must be dropped.
    expect(levels.some((l) => l.pressureHpa === 925)).toBe(false);
    expect(levels.some((l) => l.pressureHpa === 900)).toBe(true);
    expect(levels.every((l) => l.aglFt >= 0)).toBe(true);
    const heights = levels.map((l) => l.aglFt);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });
});
