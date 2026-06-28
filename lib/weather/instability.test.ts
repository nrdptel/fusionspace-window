import { describe, it, expect } from "vitest";
import { classifyCape, peakCape } from "./instability";

describe("classifyCape", () => {
  it("maps CAPE to the standard bands", () => {
    expect(classifyCape(0).band).toBe("none");
    expect(classifyCape(299).band).toBe("none");
    expect(classifyCape(300).band).toBe("marginal");
    expect(classifyCape(900).band).toBe("marginal");
    expect(classifyCape(1000).band).toBe("moderate");
    expect(classifyCape(2499).band).toBe("moderate");
    expect(classifyCape(2500).band).toBe("strong");
  });

  it("tones escalate and labels are human", () => {
    expect(classifyCape(50).tone).toBe("emerald");
    expect(classifyCape(1500).tone).toBe("amber");
    expect(classifyCape(3000).tone).toBe("red");
    expect(classifyCape(1500).label).toBe("Moderately unstable");
  });

  it("treats NaN as stable", () => {
    expect(classifyCape(NaN).band).toBe("none");
  });
});

describe("peakCape", () => {
  const hourly = [0, 100, 600, 1700, 1200, 200].map((capeJkg, i) => ({
    time: `2026-06-27T${String(i + 10).padStart(2, "0")}:00`,
    capeJkg,
  }));

  it("finds the highest CAPE and when it occurs", () => {
    const p = peakCape(hourly, 0);
    expect(p).not.toBeNull();
    expect(p!.valueJkg).toBe(1700);
    expect(p!.index).toBe(3);
    expect(p!.time).toBe("2026-06-27T13:00");
  });

  it("respects the start index and horizon", () => {
    const p = peakCape(hourly, 4, 2);
    expect(p!.valueJkg).toBe(1200); // only indices 4,5 considered
  });

  it("returns null for an empty range", () => {
    expect(peakCape(hourly, 10)).toBeNull();
  });
});
