import { describe, it, expect } from "vitest";
import { buildBatchUrl, buildAirQualityBatchUrl, summarizeSiteFeed, buildMeta, buildSitesFile, buildSiteDetail, buildGeoJson, siteSlug, siteUrl, API_ENDPOINTS, API_LICENSE } from "./sitefeed";
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

/** An air-quality element aligned to the same request order. */
function aq(usAqi: number, pm25: number, pm10: number) {
  return { current: { us_aqi: usAqi, pm2_5: pm25, pm10: pm10 } };
}

/** A fully-populated batched element — every current variable plus the daily block. */
function full() {
  return {
    current: {
      wind_speed_10m: 10,
      wind_direction_10m: 270,
      wind_gusts_10m: 20,
      temperature_2m: 90,
      apparent_temperature: 95,
      relative_humidity_2m: 20,
      surface_pressure: 850,
      cape: 1500,
      cloud_cover: 40,
      weather_code: 95,
      is_day: 1,
    },
    daily: {
      wind_speed_10m_max: [18],
      wind_gusts_10m_max: [26],
      wind_direction_10m_dominant: [225],
      temperature_2m_max: [96],
      temperature_2m_min: [70],
      precipitation_sum: [0.12],
      precipitation_probability_max: [30],
      sunrise: ["2026-07-03T05:50"],
      sunset: ["2026-07-03T20:10"],
    },
  };
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
    // Enriched current + a single daily block, all in the one request.
    expect(u.searchParams.get("current")).toContain("surface_pressure");
    expect(u.searchParams.get("current")).toContain("cape");
    expect(u.searchParams.get("current")).toContain("weather_code");
    expect(u.searchParams.get("daily")).toContain("wind_speed_10m_max");
    expect(u.searchParams.get("daily")).toContain("wind_direction_10m_dominant");
    expect(u.searchParams.get("daily")).toContain("sunrise");
    expect(u.searchParams.get("precipitation_unit")).toBe("inch");
  });

  it("defaults to the full curated site list", () => {
    const u = new URL(buildBatchUrl());
    // Same count of lats as sites, and well under Open-Meteo's 1,000-location cap.
    const lats = u.searchParams.get("latitude")!.split(",");
    expect(lats.length).toBeGreaterThan(50);
    expect(lats.length).toBeLessThan(1000);
  });
});

describe("buildAirQualityBatchUrl", () => {
  it("batches every site to the Air-Quality API for AQI + particulate", () => {
    const u = new URL(buildAirQualityBatchUrl(SITES));
    expect(u.origin + u.pathname).toBe("https://air-quality-api.open-meteo.com/v1/air-quality");
    expect(u.searchParams.get("latitude")).toBe("34.5,30.87,39.01");
    expect(u.searchParams.get("current")).toBe("us_aqi,pm2_5,pm10");
  });
});

describe("summarizeSiteFeed", () => {
  const now = "2026-07-03T12:00:00Z";

  it("maps a batched (array) response to one entry per site, in order", () => {
    const raw = [el(8, 270, 12, 70), el(21, 180, 28, 95), el(16, 90, 18, 60)];
    const feed = summarizeSiteFeed(raw, now, SITES);
    expect(feed.schema_version).toBe(1);
    expect(feed.generated_at).toBe(now);
    expect(feed.model).toBe("gfs_seamless");
    expect(feed.count).toBe(3);
    expect(feed.sites).toHaveLength(3);
    expect(feed.sites[0]).toMatchObject({ name: "A — one", state: "CA", wind_mph: 8, gust_mph: 12, dir_deg: 270, temp_f: 70, tone: "emerald" });
    // 21 mph is over the 20 mph line → red; 16 is in the caution band (≥15) → amber.
    expect(feed.sites[1].tone).toBe("red");
    expect(feed.sites[2].tone).toBe("amber");
  });

  it("skips sites whose element is missing or lacks a usable wind", () => {
    const raw = [el(8, 270), undefined, el(null, 90)]; // B missing, C has no wind
    const feed = summarizeSiteFeed(raw, now, SITES);
    expect(feed.sites.map((s) => s.name)).toEqual(["A — one"]);
  });

  it("rounds wind, gust, direction and temp to whole numbers", () => {
    const feed = summarizeSiteFeed([el(7.4, 269.6, 11.5, 72.4)], now, [SITES[0]]);
    expect(feed.sites[0]).toMatchObject({ wind_mph: 7, gust_mph: 12, dir_deg: 270, temp_f: 72 });
  });

  it("tones the rounded wind, so the number and its band always agree at the edge", () => {
    // 14.6 mph rounds to 15 → amber (the documented 'emerald < 15' edge), not emerald.
    const feed = summarizeSiteFeed([el(14.6, 200)], now, [SITES[0]]);
    expect(feed.sites[0].wind_mph).toBe(15);
    expect(feed.sites[0].tone).toBe("amber");
  });

  it("carries null gust/temp through rather than faking them", () => {
    const raw = [el(10, 270)]; // no gust, no temp keys
    const feed = summarizeSiteFeed(raw, now, [SITES[0]]);
    expect(feed.sites[0].gust_mph).toBeNull();
    expect(feed.sites[0].temp_f).toBeNull();
  });

  it("accepts a single-location object (not just an array)", () => {
    const feed = summarizeSiteFeed(el(5, 200), now, [SITES[0]]);
    expect(feed.sites).toHaveLength(1);
    expect(feed.sites[0].wind_mph).toBe(5);
  });

  it("produces a compact, JSON-serialisable feed with snake_case keys", () => {
    const raw = SITES.map((_, i) => el(5 + i, 270));
    const feed = summarizeSiteFeed(raw, now, SITES);
    const round = JSON.parse(JSON.stringify(feed));
    expect(round).toEqual(feed);
    // Wire format matches the sibling motor API: snake_case, no camelCase leakage.
    expect(Object.keys(feed)).toEqual(["schema_version", "generated_at", "model", "count", "sites"]);
    expect(Object.keys(feed.sites[0])).toEqual([
      "name", "state", "slug", "lat", "lon", "url", "wind_mph", "gust_mph", "dir_deg", "steadiness",
      "temp_f", "apparent_temp_f", "humidity_pct", "dewpoint_f", "pressure_hpa", "density_altitude_ft",
      "cape_jkg", "storm", "cloud_cover_pct", "weather_code", "conditions", "is_day",
      "aqi", "aqi_category", "pm2_5", "pm10", "tone", "today",
    ]);
  });

  it("derives the full snapshot from a populated element", () => {
    const feed = summarizeSiteFeed([full()], now, [SITES[0]], "https://example.test", [aq(164, 61.4, 22.1)]);
    const s = feed.sites[0];
    expect(s).toMatchObject({
      slug: "a-one",
      wind_mph: 10, gust_mph: 20, dir_deg: 270,
      steadiness: "very-gusty",         // gust 2× the sustained wind
      temp_f: 90, apparent_temp_f: 95, humidity_pct: 20,
      pressure_hpa: 850, cape_jkg: 1500,
      storm: "moderate",                // 1000 ≤ CAPE < 2500
      cloud_cover_pct: 40,
      weather_code: 95, conditions: "Thunderstorm", is_day: true,
      aqi: 164, aqi_category: "unhealthy", pm2_5: 61, pm10: 22, // 151–200 → unhealthy
      tone: "emerald",
    });
    // A shareable board deep-link with the field's coordinates and label.
    expect(s.url).toBe("https://example.test/?lat=34.5&lon=-116.9&label=A+%E2%80%94+one");
    // Dew point below the dry-bulb temp; density altitude well above the field on a hot, high, dry day.
    expect(s.dewpoint_f).toBeLessThan(90);
    expect(s.density_altitude_ft).toBeGreaterThan(5000);
    expect((s.density_altitude_ft as number) % 10).toBe(0); // rounded to 10 ft
    expect(s.today).toEqual({
      max_wind_mph: 18, max_gust_mph: 26, dominant_dir_deg: 225, high_f: 96, low_f: 70,
      precip_in: 0.12, precip_chance_pct: 30, sunrise: "2026-07-03T05:50", sunset: "2026-07-03T20:10",
    });
  });

  it("degrades each derived field to null independently when its inputs are missing", () => {
    // Only wind + direction present (no gust, temp, humidity, pressure, cape, daily).
    const s = summarizeSiteFeed([el(8, 270)], now, [SITES[0]]).sites[0];
    expect(s.steadiness).toBeNull();
    expect(s.dewpoint_f).toBeNull();
    expect(s.density_altitude_ft).toBeNull();
    expect(s.storm).toBeNull();
    expect(s.today).toBeNull();
    // Air quality is a separate best-effort request; absent when not supplied.
    expect(s.aqi).toBeNull();
    expect(s.aqi_category).toBeNull();
    expect(s.pm2_5).toBeNull();
    // …but the site is still included, with its identity intact — a missing extra never drops a row.
    expect(s.wind_mph).toBe(8);
    expect(s.slug).toBe("a-one");
    expect(s.url).toContain("lat=34.5");
  });

  it("aligns air quality by index and survives a missing AQ element", () => {
    // Three sites; AQ only present for the first and third (second is undefined).
    const raw = [el(8, 270), el(12, 180), el(5, 90)];
    const aqRaw = [aq(30, 5, 9), undefined, aq(210, 90, 40)];
    const feed = summarizeSiteFeed(raw, now, SITES, "https://example.test", aqRaw);
    expect(feed.sites[0]).toMatchObject({ aqi: 30, aqi_category: "good" });
    expect(feed.sites[1].aqi).toBeNull(); // AQ element missing → null, site still present
    expect(feed.sites[2]).toMatchObject({ aqi: 210, aqi_category: "very-unhealthy" }); // 201–300 band
  });
});

describe("siteSlug", () => {
  it("makes a stable URL-safe id from a field name", () => {
    expect(siteSlug("SEARS — Samson")).toBe("sears-samson");
    expect(siteSlug("Black Rock Desert — Gerlach")).toBe("black-rock-desert-gerlach");
    expect(siteSlug("  Trailing — Space  ")).toBe("trailing-space");
  });
});

describe("buildSitesFile", () => {
  it("emits the static roster with slug + board link and no weather data", () => {
    const file = buildSitesFile("2026-07-03T12:00:00Z", SITES, "https://example.test");
    expect(file).toEqual({
      schema_version: 1,
      generated_at: "2026-07-03T12:00:00Z",
      count: 3,
      sites: [
        { name: "A — one", state: "CA", slug: "a-one", lat: 34.5, lon: -116.9, url: siteUrl(SITES[0], "https://example.test") },
        { name: "B — two", state: "TX", slug: "b-two", lat: 30.87, lon: -96.62, url: siteUrl(SITES[1], "https://example.test") },
        { name: "C — three", state: "CO", slug: "c-three", lat: 39.01, lon: -105.7, url: siteUrl(SITES[2], "https://example.test") },
      ],
    });
  });
});

describe("buildSiteDetail", () => {
  const now = "2026-07-03T12:00:00Z";
  it("wraps one site with the feed's version and time", () => {
    const feed = summarizeSiteFeed([full()], now, [SITES[0]], "https://example.test");
    const detail = buildSiteDetail(feed, feed.sites[0]);
    expect(detail).toEqual({
      schema_version: 1,
      generated_at: now,
      model: "gfs_seamless",
      site: feed.sites[0],
    });
  });
});

describe("buildMeta", () => {
  const now = "2026-07-03T12:00:00Z";

  it("summarises the feed into a self-describing meta object", () => {
    const raw = [el(8, 270), el(12, 180), el(5, 90)];
    const feed = summarizeSiteFeed(raw, now, SITES);
    const meta = buildMeta(feed, "https://window.fusionspace.co/api");
    expect(meta).toEqual({
      schema_version: 1,
      generated_at: now,
      model: "gfs_seamless",
      counts: { sites: 3, states: 3 },
      endpoints: API_ENDPOINTS,
      docs: "https://window.fusionspace.co/api",
      license: API_LICENSE,
      notes: expect.any(String),
      reference: {
        surface_wind_limit_mph: 20,
        wind_tone_mph: { emerald: "< 15", amber: "15–20", red: ">= 20" },
        storm_cape_jkg: { none: "< 300", marginal: "300–1000", moderate: "1000–2500", strong: ">= 2500" },
      },
    });
  });

  it("counts distinct states, not rows", () => {
    const twoCal: LaunchSite[] = [
      { name: "X", state: "CA", lat: 1, lon: 2 },
      { name: "Y", state: "CA", lat: 3, lon: 4 },
    ];
    const feed = summarizeSiteFeed([el(5, 10), el(6, 20)], now, twoCal);
    const meta = buildMeta(feed, "https://example.test/api");
    expect(meta.counts).toEqual({ sites: 2, states: 1 });
  });

  it("passes a null generated_at through (failed refresh)", () => {
    const empty = summarizeSiteFeed([], now, []);
    const meta = buildMeta({ ...empty, generated_at: null }, "https://example.test/api");
    expect(meta.generated_at).toBeNull();
    expect(meta.counts).toEqual({ sites: 0, states: 0 });
  });
});

describe("buildGeoJson", () => {
  const now = "2026-07-03T12:00:00Z";

  it("emits a FeatureCollection with [lon, lat] Point geometry and the site in properties", () => {
    const feed = summarizeSiteFeed([el(8, 270), el(12, 180)], now, SITES.slice(0, 2));
    const gj = buildGeoJson(feed);
    expect(gj.type).toBe("FeatureCollection");
    expect(gj.generated_at).toBe(now);
    expect(gj.features).toHaveLength(2);
    const f = gj.features[0];
    expect(f.type).toBe("Feature");
    expect(f.geometry).toEqual({ type: "Point", coordinates: [SITES[0].lon, SITES[0].lat] }); // [lon, lat]
    expect(f.properties.name).toBe("A — one");
    expect(f.properties.wind_mph).toBe(8);
  });
});
