/** The "all sites at a glance" feed — the current conditions at every curated launch field,
 *  toned against the 20 mph line, fetched in ONE batched Open-Meteo request rather than one per
 *  field. A build-time script (scripts/gen-conditions.ts), re-run by an hourly deploy, calls
 *  buildBatchUrl once, runs summarizeSiteFeed over the response, and writes the result under
 *  public/api/v1/ — served as a plain static asset, and the public API (unmetered on Cloudflare
 *  Pages: no Workers/KV, no request cap). A flyer near several clubs sees which are flyable now
 *  without opening each, and no visitor's browser has to hammer the API for 100+ fields.
 *
 *  Each site carries the full current snapshot the board leads with — surface wind and its
 *  steadiness, density altitude (thrust & recovery), storm potential (CAPE), the moisture read
 *  (humidity/dew point), pressure, sky, and today's forecast peaks — all derived from the same
 *  single batched request via the shared, tested calculators, so the API and the board never
 *  disagree. The heavier per-field views (winds aloft, the multi-day timeline, landing drift)
 *  stay in the interactive tool: they're parameterized and too costly to precompute ×100 hourly.
 *
 *  Wire format is snake_case (schema_version, generated_at, wind_mph, …) to match the sibling
 *  motor.fusionspace.co API exactly. Model-only by design (gfs_seamless); the observed station
 *  cross-check stays in the per-field view. Pure; the fetch/write lives in gen-conditions.ts. */

import { LAUNCH_SITES, type LaunchSite } from "../launchSites";
import { SITE_URL } from "../links";
import { encodeState } from "../state";
import { windTone, SURFACE_LIMIT_MPH, DEFAULT_CAUTION_MPH, type WindTone } from "./limits";
import { densityAltitudeFt } from "./density";
import { dewPointF } from "./dewpoint";
import { gustiness, type GustBand } from "./gust";
import { classifyCape, type InstabilityBand } from "./instability";
import { classifyAqi, type AqiBand } from "./airquality";
import { describeWeather } from "./wmo";

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality";
// Mirrors net.ts MODEL — the board's model, kept in sync so the overview and the drill-down agree.
const MODEL = "gfs_seamless";
/** Feed schema version — bumped on any breaking change to the JSON shape, so API consumers can
 *  pin to it (published in the /api/v1 path and in meta.json). Additive fields don't bump it. */
export const SCHEMA_VERSION = 1;

/** License line for the API, mirroring the sibling motor.fusionspace.co wording verbatim. */
export const API_LICENSE = "Free to use; attribution appreciated; provided as-is";
/** The files the API serves, in the order the docs list them. The `{slug}` entry is a template —
 *  one static file per field lives at that path (the site's `slug`). */
export const API_ENDPOINTS = [
  "/api/v1/conditions.json",
  "/api/v1/conditions.geojson",
  "/api/v1/sites.json",
  "/api/v1/sites/{slug}.json",
  "/api/v1/meta.json",
  "/api/v1/openapi.json",
];

/** Stable URL-safe id for a field, derived from its name (e.g. "SEARS — Samson" → "sears-samson").
 *  Used as the per-site detail filename and as each site's `slug`. The curated names are unique, so
 *  the slugs are too. Pure and deterministic. */
export function siteSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
const META_NOTES =
  "Modeled conditions (gfs_seamless), not observed station data — best-effort and approximate. Confirm at the field before flying.";

/** One batched request for every site. Open-Meteo accepts comma-separated latitude/longitude (up
 *  to 1,000 locations) and returns an array of results in the same order, so all the fields cost a
 *  single call. It stays cheap: the current block is one timestep (many variables barely add
 *  weight), and the daily block is a single day — well within the free non-commercial allowance. */
export function buildBatchUrl(sites: readonly LaunchSite[] = LAUNCH_SITES): string {
  const p = new URLSearchParams({
    latitude: sites.map((s) => s.lat).join(","),
    longitude: sites.map((s) => s.lon).join(","),
    current:
      "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,apparent_temperature," +
      "relative_humidity_2m,surface_pressure,cape,cloud_cover,weather_code,is_day",
    daily:
      "wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,temperature_2m_max," +
      "temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset",
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    models: MODEL,
    forecast_days: "1",
    timezone: "auto",
  });
  return `${OPEN_METEO}?${p.toString()}`;
}

/** A second batched request, to Open-Meteo's separate (free, keyless) Air-Quality API, for the US
 *  AQI and the smoke/dust particulate at every field. Same comma-separated-locations batching, so
 *  it's one more call per refresh — best-effort: if it fails, the AQ fields just come back null. */
export function buildAirQualityBatchUrl(sites: readonly LaunchSite[] = LAUNCH_SITES): string {
  const p = new URLSearchParams({
    latitude: sites.map((s) => s.lat).join(","),
    longitude: sites.map((s) => s.lon).join(","),
    current: "us_aqi,pm2_5,pm10",
    timezone: "auto",
  });
  return `${AIR_QUALITY}?${p.toString()}`;
}

/** Today's forecast peaks + the daylight window, from the daily aggregates. */
export interface SiteToday {
  max_wind_mph: number | null;
  max_gust_mph: number | null;
  /** Dominant wind direction for the day, degrees (rounded) — for pad/rail setup. */
  dominant_dir_deg: number | null;
  high_f: number | null;
  low_f: number | null;
  /** Total precipitation for the day, inches — null when absent. */
  precip_in: number | null;
  precip_chance_pct: number | null;
  /** Local-time ISO sunrise/sunset for launch-day planning — null when absent. */
  sunrise: string | null;
  sunset: string | null;
}

/** The shareable board link for a field — the same `?lat=&lon=&label=` URL the site itself uses,
 *  so an API consumer can deep-link straight to the interactive board (motor lists a `url` too). */
export function siteUrl(site: { name: string; lat: number; lon: number }, baseUrl: string = SITE_URL): string {
  return `${baseUrl}/?${encodeState({ lat: site.lat, lon: site.lon, label: site.name })}`;
}

export interface SiteConditions {
  name: string;
  state: string;
  /** Stable URL-safe id — also the per-site detail filename (/api/v1/sites/{slug}.json). */
  slug: string;
  lat: number;
  lon: number;
  /** Deep link to this field's interactive board. */
  url: string;
  /** Sustained surface wind, mph (10 m), rounded. */
  wind_mph: number;
  /** Gust, mph (rounded) — null when the model omits it. */
  gust_mph: number | null;
  /** Direction the wind blows FROM, degrees (rounded). */
  dir_deg: number;
  /** How much the gusts overshoot the sustained wind — null when there's no gust reading. */
  steadiness: GustBand | null;
  /** Temperature, °F (rounded) — null when absent. */
  temp_f: number | null;
  /** "Feels like" temperature, °F (rounded) — null when absent. */
  apparent_temp_f: number | null;
  /** Relative humidity, % (rounded) — null when absent. */
  humidity_pct: number | null;
  /** Dew point, °F (rounded); a tight spread with temp_f warns of fog/condensation. Null if absent. */
  dewpoint_f: number | null;
  /** Station (surface) pressure, hPa (rounded) — null when absent. */
  pressure_hpa: number | null;
  /** Density altitude, ft (rounded to 10) — thin air cuts thrust and speeds descent. Null if inputs absent. */
  density_altitude_ft: number | null;
  /** Convective available potential energy, J/kg (rounded) — null when absent. */
  cape_jkg: number | null;
  /** Storm potential band from CAPE — null when CAPE is absent. */
  storm: InstabilityBand | null;
  /** Cloud cover, % (rounded) — null when absent. */
  cloud_cover_pct: number | null;
  /** WMO weather-interpretation code — null when absent. */
  weather_code: number | null;
  /** Short sky/precip label from weather_code (e.g. "Clear", "Rain", "Thunderstorm") — null if unknown. */
  conditions: string | null;
  /** Daylight flag (true = day) — null when absent. */
  is_day: boolean | null;
  /** US EPA Air Quality Index (0–500, rounded) — null when the Air-Quality API was unreachable. */
  aqi: number | null;
  /** EPA AQI category band — null when absent. Smoke/haze cuts the visibility you need to track a flight. */
  aqi_category: AqiBand | null;
  /** Fine particulate (≈ smoke), µg/m³ (rounded) — null when absent. */
  pm2_5: number | null;
  /** Coarse particulate (≈ dust), µg/m³ (rounded) — null when absent. */
  pm10: number | null;
  /** Tone against the 20 mph line (emerald / amber / red), the default caution band. */
  tone: WindTone;
  /** Today's forecast peaks — null when the daily block is absent. */
  today: SiteToday | null;
}

export interface SiteFeed {
  /** Feed schema version (see SCHEMA_VERSION). */
  schema_version: number;
  /** ISO timestamp the feed was generated (the fetch time); null if the last refresh failed. */
  generated_at: string | null;
  /** Model the winds came from (matches the board). */
  model: string;
  /** Number of entries in `sites` (motor's list responses carry the same field). */
  count: number;
  /** One entry per site that returned usable wind; sites missing data are omitted. */
  sites: SiteConditions[];
}

/** Machine-readable thresholds behind the derived fields, so a consumer can interpret `tone` and
 *  `storm` without hard-coding the edges. Sourced from the same constants the board uses. */
export interface ApiReference {
  surface_wind_limit_mph: number;
  wind_tone_mph: { emerald: string; amber: string; red: string };
  storm_cape_jkg: { none: string; marginal: string; moderate: string; strong: string };
}

/** Self-describing metadata file, mirroring motor.fusionspace.co's meta.json shape: schema
 *  version, generation time, counts, the endpoint list, docs URL, license, an honesty note, and a
 *  reference block spelling out the tone/storm thresholds. */
export interface SiteFeedMeta {
  schema_version: number;
  generated_at: string | null;
  model: string;
  counts: { sites: number; states: number };
  endpoints: string[];
  docs: string;
  license: string;
  notes: string;
  reference: ApiReference;
}

/** GeoJSON view of the feed — a FeatureCollection of Point features, so it drops straight into
 *  Leaflet, Mapbox, QGIS, kepler.gl, etc. Each site's full snapshot rides in `properties`. */
export interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: SiteConditions;
}
export interface GeoFeatureCollection {
  type: "FeatureCollection";
  generated_at: string | null;
  features: GeoFeature[];
}

/** The curated field database as its own endpoint (name/state/slug/coords + board link), with zero
 *  weather-API cost — just the static roster. The analogue of motor's vendors.json. */
export interface SitesFile {
  schema_version: number;
  generated_at: string;
  count: number;
  sites: { name: string; state: string; slug: string; lat: number; lon: number; url: string }[];
}

/** A single field's conditions on its own — the per-site detail endpoint (/api/v1/sites/{slug}.json),
 *  mirroring motor's per-motor files. Just the one site, wrapped with the feed's version/time. */
export interface SiteDetail {
  schema_version: number;
  generated_at: string | null;
  model: string;
  site: SiteConditions;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** First value of a daily aggregate array (forecast_days=1 → one element), or null. */
function daily1(v: unknown): number | null {
  return Array.isArray(v) ? num(v[0]) : null;
}

/** First value of a daily ISO-string array (sunrise/sunset), or null. */
function iso1(v: unknown): string | null {
  return Array.isArray(v) && typeof v[0] === "string" ? v[0] : null;
}

/** Round a usable number to the nearest integer, passing null through. */
function round(v: number | null): number | null {
  return v == null ? null : Math.round(v);
}

/** Round to the nearest `step` (e.g. density altitude to 10 ft — sub-10-ft precision is false). */
function roundTo(v: number | null, step: number): number | null {
  return v == null || !Number.isFinite(v) ? null : Math.round(v / step) * step;
}

/** Round to two decimals (precipitation, inches). */
function round2(v: number | null): number | null {
  return v == null ? null : Math.round(v * 100) / 100;
}

/** Turn a batched Open-Meteo response into the site feed. The response is an array (one element
 *  per location, in request order) — or a single object when only one location was requested.
 *  `generatedAt` is passed in so this stays pure (no clock); the caller supplies its build time.
 *  Sites whose element is missing or lacks a usable wind are skipped rather than faked; every
 *  other field degrades to null independently rather than dropping the whole site. */
export function summarizeSiteFeed(
  raw: unknown,
  generatedAt: string,
  sites: readonly LaunchSite[] = LAUNCH_SITES,
  baseUrl: string = SITE_URL,
  aqRaw: unknown = undefined,
): SiteFeed {
  const arr: unknown[] = Array.isArray(raw) ? raw : [raw];
  // The air-quality response is index-aligned to the same request order (or a single object).
  const aqArr: unknown[] = aqRaw === undefined ? [] : Array.isArray(aqRaw) ? aqRaw : [aqRaw];
  const out: SiteConditions[] = [];
  for (let i = 0; i < sites.length; i++) {
    const el = arr[i] as { current?: Record<string, unknown>; daily?: Record<string, unknown> } | undefined;
    const c = el?.current;
    if (!c) continue;
    const windRaw = num(c.wind_speed_10m);
    const dirRaw = num(c.wind_direction_10m);
    if (windRaw == null || dirRaw == null) continue;

    const s = sites[i];
    // Reported whole; tone is taken from the same rounded integer so the number and its band
    // always agree (e.g. 15 → amber, matching the documented "emerald < 15" edge).
    const wind = Math.round(windRaw);
    const gust = round(num(c.wind_gusts_10m));
    const tempRaw = num(c.temperature_2m);
    const humidityRaw = num(c.relative_humidity_2m);
    const pressureRaw = num(c.surface_pressure);
    const capeRaw = num(c.cape);

    // Derived, reusing the board's tested calculators so the API and the board can't drift.
    const dewF =
      tempRaw != null && humidityRaw != null ? round(dewPointF(tempRaw, humidityRaw)) : null;
    const densityAlt =
      tempRaw != null && humidityRaw != null && pressureRaw != null
        ? roundTo(densityAltitudeFt({ tempF: tempRaw, rhPct: humidityRaw, pressureHpa: pressureRaw }), 10)
        : null;

    const weatherCode = num(c.weather_code);
    const isDayRaw = num(c.is_day);

    const aqC = (aqArr[i] as { current?: Record<string, unknown> } | undefined)?.current;
    const aqiRaw = aqC ? num(aqC.us_aqi) : null;

    const d = el?.daily;
    const today: SiteToday | null = d
      ? {
          max_wind_mph: round(daily1(d.wind_speed_10m_max)),
          max_gust_mph: round(daily1(d.wind_gusts_10m_max)),
          dominant_dir_deg: round(daily1(d.wind_direction_10m_dominant)),
          high_f: round(daily1(d.temperature_2m_max)),
          low_f: round(daily1(d.temperature_2m_min)),
          precip_in: round2(daily1(d.precipitation_sum)),
          precip_chance_pct: round(daily1(d.precipitation_probability_max)),
          sunrise: iso1(d.sunrise),
          sunset: iso1(d.sunset),
        }
      : null;

    out.push({
      name: s.name,
      state: s.state,
      slug: siteSlug(s.name),
      lat: s.lat,
      lon: s.lon,
      url: siteUrl(s, baseUrl),
      wind_mph: wind,
      gust_mph: gust,
      dir_deg: Math.round(dirRaw),
      steadiness: gust != null ? gustiness(wind, gust).band : null,
      temp_f: round(tempRaw),
      apparent_temp_f: round(num(c.apparent_temperature)),
      humidity_pct: round(humidityRaw),
      dewpoint_f: dewF,
      pressure_hpa: round(pressureRaw),
      density_altitude_ft: densityAlt,
      cape_jkg: round(capeRaw),
      storm: capeRaw != null ? classifyCape(capeRaw).band : null,
      cloud_cover_pct: round(num(c.cloud_cover)),
      weather_code: weatherCode,
      conditions: weatherCode != null ? describeWeather(weatherCode).label.replace(/^—$/, "") || null : null,
      is_day: isDayRaw == null ? null : isDayRaw === 1,
      aqi: aqiRaw == null ? null : Math.round(aqiRaw),
      aqi_category: aqiRaw == null ? null : classifyAqi(aqiRaw).band,
      pm2_5: round(aqC ? num(aqC.pm2_5) : null),
      pm10: round(aqC ? num(aqC.pm10) : null),
      tone: windTone(wind),
      today,
    });
  }
  return { schema_version: SCHEMA_VERSION, generated_at: generatedAt, model: MODEL, count: out.length, sites: out };
}

/** Build the self-describing meta.json from a feed. `docsUrl` is the absolute URL of the human
 *  docs page (fork-overridable via SITE_URL), so a fork's meta points at its own docs. Pure. */
export function buildMeta(feed: SiteFeed, docsUrl: string): SiteFeedMeta {
  return {
    schema_version: feed.schema_version,
    generated_at: feed.generated_at,
    model: feed.model,
    counts: {
      sites: feed.count,
      states: new Set(feed.sites.map((s) => s.state)).size,
    },
    endpoints: API_ENDPOINTS,
    docs: docsUrl,
    license: API_LICENSE,
    notes: META_NOTES,
    reference: {
      surface_wind_limit_mph: SURFACE_LIMIT_MPH,
      wind_tone_mph: {
        emerald: `< ${DEFAULT_CAUTION_MPH}`,
        amber: `${DEFAULT_CAUTION_MPH}–${SURFACE_LIMIT_MPH}`,
        red: `>= ${SURFACE_LIMIT_MPH}`,
      },
      // SPC-style CAPE bands, matching classifyCape() in instability.ts.
      storm_cape_jkg: { none: "< 300", marginal: "300–1000", moderate: "1000–2500", strong: ">= 2500" },
    },
  };
}

/** Build the GeoJSON FeatureCollection from a feed — one Point per site (coordinates are
 *  [lon, lat] per the GeoJSON spec), the site's snapshot in `properties`. Pure. */
export function buildGeoJson(feed: SiteFeed): GeoFeatureCollection {
  return {
    type: "FeatureCollection",
    generated_at: feed.generated_at,
    features: feed.sites.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: s,
    })),
  };
}

/** Build the static sites.json roster from the curated list. No weather API involved. Pure. */
export function buildSitesFile(
  generatedAt: string,
  sites: readonly LaunchSite[] = LAUNCH_SITES,
  baseUrl: string = SITE_URL,
): SitesFile {
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: generatedAt,
    count: sites.length,
    sites: sites.map((s) => ({
      name: s.name,
      state: s.state,
      slug: siteSlug(s.name),
      lat: s.lat,
      lon: s.lon,
      url: siteUrl(s, baseUrl),
    })),
  };
}

/** Wrap one site as its own detail document (for /api/v1/sites/{slug}.json). Pure. */
export function buildSiteDetail(feed: SiteFeed, site: SiteConditions): SiteDetail {
  return {
    schema_version: feed.schema_version,
    generated_at: feed.generated_at,
    model: feed.model,
    site,
  };
}
