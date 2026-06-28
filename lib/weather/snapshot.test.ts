import { describe, it, expect } from "vitest";
import forecastFixture from "./__fixtures__/forecast.json";
import { parseForecast, type RawForecast } from "./forecast";
import { hourSnapshot } from "./snapshot";

const fc = parseForecast(forecastFixture as unknown as RawForecast, "gfs_seamless");

describe("hourSnapshot", () => {
  it("composes wind, temp, density altitude, and storm band for an hour", () => {
    // Hour 14 in the fixture: hot, windy midday with high CAPE.
    const s = hourSnapshot(fc.hourly[14]);
    expect(s.windMph).toBe(fc.hourly[14].windMph);
    expect(s.tempF).toBe(fc.hourly[14].tempF);
    expect(Number.isFinite(s.densityAltitudeFt)).toBe(true);
    expect(s.densityAltitudeFt).toBeGreaterThan(3000);
    expect(["moderate", "strong"]).toContain(s.instability.band);
  });

  it("density altitude is higher in the heat of the day than overnight", () => {
    const noon = hourSnapshot(fc.hourly[14]); // hot
    const night = hourSnapshot(fc.hourly[3]); // cool
    expect(noon.densityAltitudeFt).toBeGreaterThan(night.densityAltitudeFt);
  });

  it("a calm, stable overnight hour reads as stable", () => {
    const s = hourSnapshot(fc.hourly[3]);
    expect(s.instability.band).toBe("none");
  });
});
