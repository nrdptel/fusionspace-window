import { describe, it, expect } from "vitest";
import { lowCloudRead, lowCloudOutlook, lowCloudHeadline, type LowCloudHour } from "./lowcloud";

describe("lowCloudRead", () => {
  it("bands cover into thin / broken / overcast", () => {
    expect(lowCloudRead(0)).toMatchObject({ band: "thin", tone: "emerald" });
    expect(lowCloudRead(39)).toMatchObject({ band: "thin", tone: "emerald" });
    expect(lowCloudRead(40)).toMatchObject({ band: "broken", tone: "amber" });
    expect(lowCloudRead(74)).toMatchObject({ band: "broken", tone: "amber" });
    expect(lowCloudRead(75)).toMatchObject({ band: "overcast", tone: "red" });
    expect(lowCloudRead(100)).toMatchObject({ band: "overcast", tone: "red", label: "Overcast" });
  });
});

const hrs = (vals: number[]): LowCloudHour[] =>
  vals.map((v, i) => ({ time: `2026-06-27T${String(i).padStart(2, "0")}:00`, cloudCoverLowPct: v }));

describe("lowCloudOutlook", () => {
  it("returns null when the model gives nothing usable", () => {
    expect(lowCloudOutlook([])).toBeNull();
    expect(lowCloudOutlook(hrs([NaN, NaN]))).toBeNull();
  });

  it("captures now, the peak, and the trough across the window", () => {
    const o = lowCloudOutlook(hrs([10, 20, 85, 30, 5]))!;
    expect(o.nowPct).toBe(10);
    expect(o.peakPct).toBe(85);
    expect(o.peakTime).toBe("2026-06-27T02:00");
    expect(o.minPct).toBe(5);
    expect(o.minTime).toBe("2026-06-27T04:00");
    expect(o.now.band).toBe("thin");
    expect(o.peak.band).toBe("overcast");
  });

  it("skips NaN holes but still reads the valid hours", () => {
    const o = lowCloudOutlook(hrs([12, NaN, 60, NaN]))!;
    expect(o.nowPct).toBe(12);
    expect(o.peakPct).toBe(60);
  });
});

describe("lowCloudHeadline", () => {
  const fmt = (iso: string) => `at ${iso.slice(11, 16)}`;

  it("flags low cloud building from a thin start", () => {
    const o = lowCloudOutlook(hrs([10, 20, 85, 30]))!;
    expect(lowCloudHeadline(o, fmt)).toBe("Thin now, building to overcast (85%) by at 02:00");
  });

  it("says it stays thin when it never builds past thin", () => {
    const o = lowCloudOutlook(hrs([10, 15, 20, 12]))!;
    expect(lowCloudHeadline(o, fmt)).toBe("Thin low cloud across the window (≤20%)");
  });

  it("flags clearing when it starts socked in and thins later", () => {
    const o = lowCloudOutlook(hrs([90, 80, 40, 20]))!;
    expect(lowCloudHeadline(o, fmt)).toBe("Overcast now (90%), thinning to 20% by at 03:00");
  });

  it("says a deck is holding when it starts and stays broken/overcast", () => {
    const o = lowCloudOutlook(hrs([85, 90, 88, 95]))!;
    expect(lowCloudHeadline(o, fmt)).toBe("Overcast low cloud (85%) holding through the window");
  });
});
