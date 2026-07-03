import { describe, it, expect } from "vitest";
import { buildBatchUrl, summarizeSiteFeed } from "./sitefeed";
import type { LaunchSite } from "../launchSites";

const SITES: LaunchSite[] = [
  { name: "A — one", state: "CA", lat: 34.5, lon: -116.9 },
  { name: "B — two", state: "TX", lat: 30.87, lon: -96.62 },
  { name: "C — three", state: "CO", lat: 39.01, lon: -105.7 },
];

function el(wind: number | null, dir: number | null, gust?: number | null, temp?: number | null) {
  const current: Record<string, unknown> = {};
  if (wind !== null) current.wind_speed_10m = wind;
  if (dir !== null) current.wind_direction_10m = dir;
  if (gust !== undefined) current.wind_gusts_10m = gust;
  if (temp !== undefined) current.temperature_2m = temp;
  return { current };
}

describe("buildBatchUrl", () => {
  it("packs every site into one request as comma-separated coordinates", () => {
    const u = new URL(buildBatchUrl(SITES));
    expect(u.origin + u.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(u.searchParams.get("latitude")).toBe("34.5,30.87,39.01");
    expect(u.searchParams.get("longitude")).toBe("-116.9,-96.62,-105.7");
    // Tiny payload: current wind + temp, one day, imperial, the board's model.
    expect(u.searchParams.get("current")).toContain("wind_speed_10m");
    expect(u.searchParams.get("wind_speed_unit")).toBe("mph");
    expect(u.searchParams.get("forecast_days")).toBe("1");
    expect(u.searchParams.get("models")).toBe("gfs_seamless");
  });

  it("defaults to the full curated site list", () => {
    const u = new URL(buildBatchUrl());
    // Same count of lats as sites, and well under Open-Meteo's 1,000-location cap.
    const lats = u.searchParams.get("latitude")!.split(",");
    expect(lats.length).toBeGreaterThan(50);
    expect(lats.length).toBeLessThan(1000);
  });
});

describe("summarizeSiteFeed", () => {
  const now = "2026-07-03T12:00:00Z";

  it("maps a batched (array) response to one entry per site, in order", () => {
    const raw = [el(8, 270, 12, 70), el(21, 180, 28, 95), el(16, 90, 18, 60)];
    const feed = summarizeSiteFeed(raw, now, SITES);
    expect(feed.generatedAt).toBe(now);
    expect(feed.model).toBe("gfs_seamless");
    expect(feed.sites).toHaveLength(3);
    expect(feed.sites[0]).toMatchObject({ name: "A — one", state: "CA", windMph: 8, gustMph: 12, dirDeg: 270, tempF: 70, tone: "emerald" });
    // 21 mph is over the 20 mph line → red; 16 is in the caution band (≥15) → amber.
    expect(feed.sites[1].tone).toBe("red");
    expect(feed.sites[2].tone).toBe("amber");
  });

  it("skips sites whose element is missing or lacks a usable wind", () => {
    const raw = [el(8, 270), undefined, el(null, 90)]; // B missing, C has no wind
    const feed = summarizeSiteFeed(raw, now, SITES);
    expect(feed.sites.map((s) => s.name)).toEqual(["A — one"]);
  });

  it("carries null gust/temp through rather than faking them", () => {
    const raw = [el(10, 270)]; // no gust, no temp keys
    const feed = summarizeSiteFeed(raw, now, [SITES[0]]);
    expect(feed.sites[0].gustMph).toBeNull();
    expect(feed.sites[0].tempF).toBeNull();
  });

  it("accepts a single-location object (not just an array)", () => {
    const feed = summarizeSiteFeed(el(5, 200), now, [SITES[0]]);
    expect(feed.sites).toHaveLength(1);
    expect(feed.sites[0].windMph).toBe(5);
  });

  it("produces a compact, JSON-serialisable feed", () => {
    const raw = SITES.map((_, i) => el(5 + i, 270));
    const feed = summarizeSiteFeed(raw, now, SITES);
    const round = JSON.parse(JSON.stringify(feed));
    expect(round).toEqual(feed);
  });
});
