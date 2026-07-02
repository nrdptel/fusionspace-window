import { describe, it, expect } from "vitest";
import { driftFtPerMin, driftPerFoot, driftLandingFt, dualDeployDrift, meanWindAloft, type DriftInput } from "./drift";

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

describe("driftFtPerMin", () => {
  it("turns a mean wind (mph) into downrange feet per minute aloft", () => {
    expect(driftFtPerMin(15)).toBeCloseTo(1320, 6); // 15 mph = 0.25 mi/min = 1,320 ft/min
    expect(driftFtPerMin(0)).toBe(0);
    expect(driftFtPerMin(60)).toBeCloseTo(5280, 6); // 60 mph = 1 mi/min
  });
});

describe("driftPerFoot", () => {
  it("matches the flyers' rule of thumb (≈1 ft per ft for ~10 mph over 15 fps)", () => {
    // 10 mph = 14.667 fps; / 15 fps ≈ 0.978 ft of drift per ft of descent.
    expect(driftPerFoot(10, 15)).toBeCloseTo(0.978, 3);
  });

  it("scales with wind and inversely with descent rate", () => {
    expect(driftPerFoot(20, 15)).toBeCloseTo(driftPerFoot(10, 15) * 2, 6);
    expect(driftPerFoot(10, 30)).toBeCloseTo(driftPerFoot(10, 15) / 2, 6);
  });

  it("is 0 for a non-positive or non-finite descent rate", () => {
    expect(driftPerFoot(10, 0)).toBe(0);
    expect(driftPerFoot(10, -5)).toBe(0);
    expect(driftPerFoot(10, NaN)).toBe(0);
  });
});

describe("driftLandingFt", () => {
  it("multiplies the per-foot drift by the descent altitude (apogee)", () => {
    // 10 mph (14.667 fps) over 15 fps × 5000 ft ≈ 4,889 ft of drift.
    expect(driftLandingFt(10, 15, 5000)).toBeCloseTo(4888.9, 0);
    expect(driftLandingFt(10, 15, 5000)).toBe(driftPerFoot(10, 15) * 5000);
  });

  it("is 0 when the descent rate or apogee can't produce drift", () => {
    expect(driftLandingFt(10, 0, 5000)).toBe(0);
    expect(driftLandingFt(10, 15, 0)).toBe(0);
    expect(driftLandingFt(10, 15, -1000)).toBe(0);
  });
});

describe("dualDeployDrift", () => {
  const opts = { apogeeFt: 5000, mainDeployFt: 1000, drogueRateFps: 50, mainRateFps: 20 };

  it("uniform wind: sums the two phases and lands much closer than a slow single deploy", () => {
    // 20 mph from W (toward E) throughout. Drogue 4000 ft @ 50 fps, main 1000 ft @ 20 fps.
    const levels = [lvl(500, 20, 270), lvl(3000, 20, 270), lvl(4800, 20, 270)];
    const d = dualDeployDrift(levels, opts)!;
    expect(d).not.toBeNull();
    expect(d.drogueFt).toBeCloseTo(2346.7, 0); // 20*1.46667/50 * 4000
    expect(d.mainFt).toBeCloseTo(1466.7, 0); // 20*1.46667/20 * 1000
    expect(d.distanceFt).toBeCloseTo(3813.3, 0); // same direction → scalar sum
    expect(d.towardDeg).toBeCloseTo(90, 0); // toward east
    // A single deploy at the (slow) main rate over the whole apogee drifts far more.
    expect(d.distanceFt).toBeLessThan(driftLandingFt(20, 20, 5000)); // 3813 << 7333
  });

  it("uses each band's own wind — opposing bands partly cancel (vector sum)", () => {
    // Lower band (<1000) blows from E (toward W); upper band (>1000) from W (toward E).
    const levels = [lvl(500, 20, 90), lvl(800, 20, 90), lvl(2000, 20, 270), lvl(3800, 20, 270)];
    const d = dualDeployDrift(levels, { apogeeFt: 4000, mainDeployFt: 1000, drogueRateFps: 50, mainRateFps: 20 })!;
    expect(d.drogueFt).toBeCloseTo(1760, 0); // 20*1.46667/50 * 3000, toward E
    expect(d.mainFt).toBeCloseTo(1466.7, 0); // 20*1.46667/20 * 1000, toward W
    // Net is the vector difference, not the sum — the phases oppose.
    expect(d.distanceFt).toBeCloseTo(293.3, 0);
    expect(d.towardDeg).toBeCloseTo(90, 0); // small net to the east
  });

  it("null on unphysical inputs", () => {
    const levels = [lvl(500, 20, 270), lvl(3000, 20, 270)];
    expect(dualDeployDrift(levels, { apogeeFt: 5000, mainDeployFt: 5000, drogueRateFps: 50, mainRateFps: 20 })).toBeNull(); // main >= apogee
    expect(dualDeployDrift(levels, { apogeeFt: 5000, mainDeployFt: 1000, drogueRateFps: 0, mainRateFps: 20 })).toBeNull();
    expect(dualDeployDrift(levels, { apogeeFt: 5000, mainDeployFt: 1000, drogueRateFps: 50, mainRateFps: 0 })).toBeNull();
    expect(dualDeployDrift([], opts)).toBeNull();
  });
});
