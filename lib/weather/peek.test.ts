import { describe, it, expect } from "vitest";
import { parseWindPeek } from "./peek";

describe("parseWindPeek", () => {
  it("reads the current wind, gust, and direction", () => {
    const p = parseWindPeek({
      current: { wind_speed_10m: 12.4, wind_direction_10m: 250, wind_gusts_10m: 19.7 },
    })!;
    expect(p.windMph).toBe(12.4);
    expect(p.dirDeg).toBe(250);
    expect(p.gustMph).toBe(19.7);
  });

  it("carries NaN gust when the model omits it", () => {
    const p = parseWindPeek({ current: { wind_speed_10m: 8, wind_direction_10m: 90 } })!;
    expect(Number.isNaN(p.gustMph)).toBe(true);
  });

  it("returns null without a usable current wind", () => {
    expect(parseWindPeek({})).toBeNull();
    expect(parseWindPeek({ current: {} })).toBeNull();
    expect(parseWindPeek({ current: { wind_speed_10m: null, wind_direction_10m: 90 } })).toBeNull();
  });
});
