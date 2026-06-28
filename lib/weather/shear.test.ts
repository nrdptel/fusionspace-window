import { describe, it, expect } from "vitest";
import { angleDelta, shearLayers, strongestShear, type ShearInput } from "./shear";

function lvl(aglFt: number, windMph: number, dirDeg: number, label = `${aglFt}`): ShearInput {
  return { aglFt, windMph, dirDeg, label };
}

describe("angleDelta", () => {
  it("returns the smallest signed difference", () => {
    expect(angleDelta(10, 40)).toBe(30);
    expect(angleDelta(350, 10)).toBe(20); // wraps past north
    expect(angleDelta(10, 350)).toBe(-20);
    expect(angleDelta(0, 180)).toBe(180);
  });
});

describe("shearLayers", () => {
  it("captures a pure speed change as vector shear", () => {
    const layers = shearLayers([lvl(0, 10, 270), lvl(1000, 30, 270)]);
    expect(layers).toHaveLength(1);
    expect(layers[0].deltaSpeedMph).toBe(20);
    expect(layers[0].deltaDirDeg).toBe(0);
    expect(layers[0].vectorMph).toBeCloseTo(20, 5);
    expect(layers[0].perKftMph).toBeCloseTo(20, 5);
  });

  it("captures a pure direction change (same speed) as vector shear", () => {
    const layers = shearLayers([lvl(0, 20, 0), lvl(1000, 20, 90)]);
    // Two equal vectors 90° apart differ by speed·√2.
    expect(layers[0].vectorMph).toBeCloseTo(20 * Math.SQRT2, 4);
    expect(layers[0].deltaDirDeg).toBe(90);
  });

  it("sorts by altitude regardless of input order", () => {
    const layers = shearLayers([lvl(5000, 40, 270), lvl(0, 5, 200), lvl(2000, 20, 240)]);
    expect(layers.map((l) => l.lowerFt)).toEqual([0, 2000]);
  });
});

describe("strongestShear", () => {
  it("finds the layer with the greatest vector shear", () => {
    const s = strongestShear([
      lvl(0, 5, 270),
      lvl(3000, 8, 270), // small change
      lvl(6000, 35, 200), // big speed + direction jump
    ]);
    expect(s).not.toBeNull();
    expect(s!.lowerFt).toBe(3000);
    expect(s!.upperFt).toBe(6000);
  });

  it("returns null with fewer than two levels", () => {
    expect(strongestShear([lvl(0, 5, 270)])).toBeNull();
    expect(strongestShear([])).toBeNull();
  });
});
