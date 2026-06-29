import { describe, it, expect } from "vitest";
import { hourConditions } from "./conditions";
import type { HourPoint } from "./model";

function hp(over: Partial<HourPoint>): HourPoint {
  return {
    time: "2026-06-27T12:00",
    tempF: 70,
    humidityPct: 30,
    surfacePressureHpa: 1010,
    windMph: 8,
    gustMph: 10,
    dirDeg: 270,
    precipProbPct: 0,
    precipIn: 0,
    cloudCoverPct: 0,
    weatherCode: 0,
    isDay: true,
    capeJkg: 0,
    visibilityMi: 30,
    ...over,
  };
}

describe("hourConditions", () => {
  it("tones each factor against its own reference", () => {
    const c = hourConditions(
      hp({ windMph: 24, gustMph: 26, capeJkg: 3000, precipProbPct: 70 }),
      null,
    );
    expect(c.wind.tone).toBe("red"); // over the 20 mph line
    expect(c.storms.tone).toBe("red"); // strongly unstable
    expect(c.storms.label).toBe("Strong");
    expect(c.precip.tone).toBe("red"); // likely rain
    expect(c.precip.label).toBe("70%");
  });

  it("reads a calm, dry, stable hour as all-green", () => {
    const c = hourConditions(hp({ windMph: 6, gustMph: 8, capeJkg: 100, precipProbPct: 5 }), null);
    expect([c.wind.tone, c.gusts.tone, c.storms.tone, c.precip.tone]).toEqual([
      "emerald",
      "emerald",
      "emerald",
      "emerald",
    ]);
    expect(c.storms.label).toBe("Stable");
    expect(c.precip.label).toBe("5%");
  });

  it("respects a lower personal wind line", () => {
    const h = hp({ windMph: 14, gustMph: 16 });
    expect(hourConditions(h, null).wind.tone).toBe("emerald"); // under the 15 mph default caution
    // Over a 12 mph personal line → caution (amber); red stays reserved for the 20 mph line.
    expect(hourConditions(h, 12).wind.tone).toBe("amber");
  });

  it("bands the chance of rain", () => {
    expect(hourConditions(hp({ precipProbPct: 10 }), null).precip.tone).toBe("emerald");
    expect(hourConditions(hp({ precipProbPct: 35 }), null).precip.tone).toBe("amber");
    expect(hourConditions(hp({ precipProbPct: 80 }), null).precip.tone).toBe("red");
  });

  it("falls back to the modelled amount when there's no probability", () => {
    expect(hourConditions(hp({ precipProbPct: null, precipIn: 0 }), null).precip).toEqual({
      tone: "emerald",
      label: "dry",
    });
    expect(hourConditions(hp({ precipProbPct: null, precipIn: 0.1 }), null).precip).toEqual({
      tone: "red",
      label: "wet",
    });
  });

  it("carries the gust steadiness band", () => {
    expect(hourConditions(hp({ windMph: 21, gustMph: 29 }), null).gusts.label).toBe("Gusty");
  });
});
