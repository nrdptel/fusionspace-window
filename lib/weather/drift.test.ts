import { describe, it, expect } from "vitest";
import { meanWindAloft, type DriftInput } from "./drift";

function lvl(aglFt: number, windMph: number, dirDeg: number): DriftInput {
  return { aglFt, windMph, dirDeg };
}

describe("meanWindAloft", () => {
  it("returns null without at least two finite levels", () => {
    expect(meanWindAloft([])).toBeNull();
    expect(meanWindAloft([lvl(0, 10, 270)])).toBeNull();
  });

  it("averages a uniform column to that same wind", () => {
    const m = meanWindAloft([lvl(0, 15, 270), lvl(5000, 15, 270), lvl(10000, 15, 270)]);
    expect(m).not.toBeNull();
    expect(m!.speedMph).toBeCloseTo(15, 4);
    expect(m!.fromDeg).toBeCloseTo(270, 3);
    // A west wind (from 270°) carries the rocket toward the east (90°).
    expect(m!.towardDeg).toBeCloseTo(90, 3);
  });

  it("drift is the opposite bearing to the wind's source", () => {
    const m = meanWindAloft([lvl(0, 10, 180), lvl(8000, 10, 180)]);
    expect(m!.fromDeg).toBeCloseTo(180, 3); // wind from the south
    expect(m!.towardDeg).toBeCloseTo(0, 3); // drifts north
  });

  it("opposing winds cancel below the scalar average", () => {
    // Equal-and-opposite winds over equal layers net to near-calm, not 20 mph.
    const m = meanWindAloft([lvl(0, 20, 270), lvl(5000, 20, 270), lvl(10000, 20, 90)]);
    expect(m).not.toBeNull();
    expect(m!.speedMph).toBeLessThan(20);
  });

  it("weights by layer thickness, so a thick band dominates a thin one", () => {
    // A thin sliver of fast cross-wind near the top shouldn't swing a deep, steady column.
    const thick = meanWindAloft([lvl(0, 10, 270), lvl(10000, 10, 270), lvl(10100, 60, 180)]);
    expect(thick).not.toBeNull();
    // Still essentially a westerly: the 100 ft sliver carries almost no weight.
    expect(thick!.fromDeg).toBeGreaterThan(255);
    expect(thick!.fromDeg).toBeLessThan(285);
  });

  it("honours a ceiling, averaging only the levels at or below it", () => {
    // Above 10k the wind reverses; capping at 10k keeps the lower westerly.
    const capped = meanWindAloft(
      [lvl(0, 12, 270), lvl(10000, 12, 270), lvl(20000, 40, 90)],
      10000,
    );
    expect(capped!.fromDeg).toBeCloseTo(270, 2);
    expect(capped!.topFt).toBe(10000);
    expect(capped!.count).toBe(2);
  });
});
