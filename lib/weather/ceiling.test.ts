import { describe, it, expect } from "vitest";
import { ceilingRead, clearanceBufferFt } from "./ceiling";

describe("clearanceBufferFt", () => {
  it("is 15% of the apogee once that beats the 500 ft floor", () => {
    expect(clearanceBufferFt(10000)).toBe(1500);
    expect(clearanceBufferFt(4000)).toBe(600);
  });

  it("floors at 500 ft for low flights", () => {
    expect(clearanceBufferFt(2000)).toBe(500); // 15% = 300, floored
    expect(clearanceBufferFt(0)).toBe(500);
  });
});

describe("ceilingRead", () => {
  it("calls a peak comfortably below the deck Clear (emerald)", () => {
    const r = ceilingRead(6500, 2000);
    expect(r.status).toBe("Clear");
    expect(r.tone).toBe("emerald");
    expect(r.marginFt).toBe(4500);
  });

  it("calls a peak just under the deck Tight (amber)", () => {
    // ceiling 6500, apogee 6200 → margin 300 < buffer max(500, 930)=930
    const r = ceilingRead(6500, 6200);
    expect(r.status).toBe("Tight");
    expect(r.tone).toBe("amber");
    expect(r.marginFt).toBe(300);
  });

  it("calls a peak at or above the deck No-go (red) with a negative margin", () => {
    const r = ceilingRead(6500, 9000);
    expect(r.status).toBe("No-go");
    expect(r.tone).toBe("red");
    expect(r.marginFt).toBe(-2500);
  });

  it("treats a peak exactly at the ceiling as No-go (you'd touch the base)", () => {
    const r = ceilingRead(5000, 5000);
    expect(r.status).toBe("No-go");
    expect(r.marginFt).toBe(0);
  });

  it("uses the percentage buffer for high flights", () => {
    // ceiling 11000, apogee 10000 → margin 1000 < buffer 1500 → Tight
    expect(ceilingRead(11000, 10000).status).toBe("Tight");
    // ceiling 12000, apogee 10000 → margin 2000 > buffer 1500 → Clear
    expect(ceilingRead(12000, 10000).status).toBe("Clear");
  });

  it("rounds a fractional ceiling/apogee difference to whole feet", () => {
    const r = ceilingRead(6496.4, 2000);
    expect(r.marginFt).toBe(4496);
  });
});
