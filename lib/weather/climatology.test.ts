import { describe, it, expect } from "vitest";
import { summarizeClimatology, compareToNormal, type RawArchive } from "./climatology";

/** Build a synthetic archive: `years` of a ±10-day window around late June, each day's max
 *  wind set to `wind` (with small per-day variation), so the normal is predictable. */
function archive(years: number, wind: number, gust: number | null = null): RawArchive {
  const time: string[] = [];
  const wmax: number[] = [];
  const gmax: (number | null)[] = [];
  for (let y = 0; y < years; y++) {
    const year = 2018 + y;
    for (let day = 17; day <= 37; day++) {
      // June has 30 days; days 17..30 are June, 31..37 spill into July (1..7).
      const iso = day <= 30 ? `${year}-06-${String(day).padStart(2, "0")}` : `${year}-07-${String(day - 30).padStart(2, "0")}`;
      time.push(iso);
      wmax.push(wind);
      gmax.push(gust);
    }
  }
  return { daily: { time, wind_speed_10m_max: wmax, wind_gusts_10m_max: gmax } };
}

describe("summarizeClimatology", () => {
  it("averages the daily-max wind over the week-of-year window across years", () => {
    const n = summarizeClimatology(archive(5, 12, 24), "2026-06-27", 7)!;
    expect(n).not.toBeNull();
    expect(n.years).toBe(5);
    expect(n.typicalWindMaxMph).toBeCloseTo(12, 6);
    expect(n.typicalGustMaxMph).toBeCloseTo(24, 6);
    // ±7 days around Jun 27 spans Jun 20–Jul 4 → 15 days × 5 years.
    expect(n.sampleDays).toBe(15 * 5);
  });

  it("ignores dates outside the window and carries null gusts", () => {
    const raw: RawArchive = {
      daily: {
        time: ["2024-01-01", "2024-06-27", "2024-06-28", "2024-06-26", "2024-12-31", "2024-06-25", "2024-06-29"],
        wind_speed_10m_max: [99, 10, 12, 8, 99, 9, 11],
        wind_gusts_10m_max: [null, null, null, null, null, null, null],
      },
    };
    const n = summarizeClimatology(raw, "2026-06-27", 3)!;
    // Only the five late-June days within 3 days of Jun 27 count; Jan/Dec are excluded.
    expect(n.sampleDays).toBe(5);
    expect(n.typicalWindMaxMph).toBeCloseTo((10 + 12 + 8 + 9 + 11) / 5, 6);
    expect(n.typicalGustMaxMph).toBeNull();
  });

  it("returns null without enough usable history", () => {
    expect(summarizeClimatology({ daily: { time: ["2024-06-27"], wind_speed_10m_max: [10] } }, "2026-06-27")).toBeNull();
    expect(summarizeClimatology({}, "2026-06-27")).toBeNull();
    expect(summarizeClimatology(archive(5, 12), "not-a-date")).toBeNull();
  });
});

describe("compareToNormal", () => {
  const normal = summarizeClimatology(archive(5, 12, 24), "2026-06-27")!;

  it("flags a clearly windier-than-usual forecast", () => {
    expect(compareToNormal(22, normal)).toBe("windier");
  });

  it("flags a clearly calmer-than-usual forecast", () => {
    expect(compareToNormal(6, normal)).toBe("calmer");
  });

  it("calls a near-normal forecast typical", () => {
    expect(compareToNormal(13, normal)).toBe("typical");
  });
});
