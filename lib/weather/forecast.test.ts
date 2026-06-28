import { describe, it, expect } from "vitest";
import forecastFixture from "./__fixtures__/forecast.json";
import { parseForecast, heightToFeet, type RawForecast } from "./forecast";
import { FT_PER_M } from "../units";

const raw = forecastFixture as unknown as RawForecast;

describe("heightToFeet", () => {
  it("passes feet through and converts metres", () => {
    expect(heightToFeet(1000, "ft")).toBe(1000);
    expect(heightToFeet(1000, "feet")).toBe(1000);
    expect(heightToFeet(100, "m")).toBeCloseTo(328.08, 1);
    // Unknown/missing unit defaults to metres (Open-Meteo's documented default).
    expect(heightToFeet(100, undefined)).toBeCloseTo(328.08, 1);
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
