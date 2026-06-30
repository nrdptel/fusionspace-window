import { describe, it, expect } from "vitest";
import { dewPointF, spreadRead } from "./dewpoint";

describe("dewPointF", () => {
  it("equals the temperature at 100% relative humidity", () => {
    expect(dewPointF(70, 100)).toBeCloseTo(70, 1);
    expect(dewPointF(32, 100)).toBeCloseTo(32, 1);
  });

  it("matches known values within a few tenths of a degree", () => {
    // 86°F (30°C) at 50% RH → ~65.4°F (18.4°C) dew point.
    expect(dewPointF(86, 50)).toBeCloseTo(65.4, 0);
    // 68°F (20°C) at 60% RH → ~53.6°F (12°C).
    expect(dewPointF(68, 60)).toBeCloseTo(53.6, 0);
  });

  it("falls as the air dries out, always at or below the temperature", () => {
    const t = 75;
    expect(dewPointF(t, 90)).toBeGreaterThan(dewPointF(t, 40));
    expect(dewPointF(t, 40)).toBeLessThan(t);
  });

  it("returns NaN when temp or humidity is missing", () => {
    expect(dewPointF(NaN, 50)).toBeNaN();
    expect(dewPointF(70, NaN)).toBeNaN();
  });
});

describe("spreadRead", () => {
  it("flags a tight spread as fog / condensation territory (amber)", () => {
    const r = spreadRead(60, 58)!; // 2°F spread
    expect(r.spreadF).toBe(2);
    expect(r.tone).toBe("amber");
    expect(r.label).toMatch(/fog/);
  });

  it("calls a moderate spread humid and a wide spread dry", () => {
    expect(spreadRead(70, 63)!.label).toMatch(/humid/); // 7°F
    expect(spreadRead(80, 50)!.label).toBe("dry air"); // 30°F
    expect(spreadRead(80, 50)!.tone).toBe("emerald");
  });

  it("floors the spread at 0 and returns null on missing data", () => {
    expect(spreadRead(60, 65)!.spreadF).toBe(0); // dew point above temp (rounding) → clamp
    expect(spreadRead(NaN, 50)).toBeNull();
    expect(spreadRead(60, NaN)).toBeNull();
  });
});
