import { describe, it, expect } from "vitest";
import { SURFACE_LIMIT_MPH, windTone, windToneTextClass } from "./limits";

describe("windTone", () => {
  it("reds at or above the 20 mph limit", () => {
    expect(windTone(20)).toBe("red");
    expect(windTone(25)).toBe("red");
    expect(SURFACE_LIMIT_MPH).toBe(20);
  });

  it("ambers in the caution band and greens below it", () => {
    expect(windTone(15)).toBe("amber"); // default caution
    expect(windTone(18)).toBe("amber");
    expect(windTone(14)).toBe("emerald");
    expect(windTone(5)).toBe("emerald");
  });

  it("honours a lower personal line for the amber band", () => {
    expect(windTone(12, 10)).toBe("amber"); // over the personal 10, under 20
    expect(windTone(9, 10)).toBe("emerald");
    expect(windTone(20, 10)).toBe("red"); // the 20 mph hard line still wins
  });
});

describe("windToneTextClass", () => {
  it("maps each tone to its light/dark classes", () => {
    expect(windToneTextClass("red")).toContain("text-red-700");
    expect(windToneTextClass("amber")).toContain("text-amber-700");
    expect(windToneTextClass("emerald")).toContain("text-emerald-700");
  });
});
