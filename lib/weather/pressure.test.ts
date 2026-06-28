import { describe, it, expect } from "vitest";
import type { HourPoint } from "./model";
import { pressureTendency } from "./pressure";

function series(pressures: number[]): HourPoint[] {
  return pressures.map((p, i) => ({
    time: `2026-06-27T${String(i).padStart(2, "0")}:00`,
    tempF: 60,
    humidityPct: 30,
    surfacePressureHpa: p,
    windMph: 5,
    gustMph: 8,
    dirDeg: 270,
    precipProbPct: 0,
    precipIn: 0,
    cloudCoverPct: 0,
    weatherCode: 0,
    isDay: true,
    capeJkg: 0,
    visibilityMi: 50,
  }));
}

describe("pressureTendency", () => {
  it("reads a clear drop as falling, with a signed rate", () => {
    const h = series([1015, 1014, 1013, 1011, 1009]);
    const t = pressureTendency(h, 4, 3)!;
    expect(t.trend).toBe("falling");
    // 3 hours back from index 4 (1009) is index 1 (1014).
    expect(t.changeHpa).toBeCloseTo(1009 - 1014, 6);
    expect(t.perHourHpa).toBeCloseTo(-5 / 3, 6);
    expect(t.spanHours).toBe(3);
  });

  it("reads a clear rise as rising", () => {
    const h = series([1000, 1002, 1004, 1006]);
    expect(pressureTendency(h, 3, 3)!.trend).toBe("rising");
  });

  it("treats small diurnal wobble as steady", () => {
    const h = series([1013.0, 1013.2, 1012.8, 1012.6]);
    expect(pressureTendency(h, 3, 3)!.trend).toBe("steady");
  });

  it("shortens the span near the start of the series", () => {
    const h = series([1010, 1007]);
    const t = pressureTendency(h, 1, 3)!;
    expect(t.spanHours).toBe(1);
    expect(t.changeHpa).toBeCloseTo(-3, 6);
  });

  it("returns null without history or with a non-finite reading", () => {
    expect(pressureTendency(series([1010]), 0, 3)).toBeNull();
    const h = series([NaN, 1010, 1009]);
    expect(pressureTendency(h, 2, 3)).toBeNull(); // earlier hour is NaN
  });
});
