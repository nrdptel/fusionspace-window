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
import { windTone, type WindTone } from "./limits";
import { densityAltitudeFt } from "./density";
import { dewPointF } from "./dewpoint";
import { gustiness, type GustBand } from "./gust";
import { classifyCape, type InstabilityBand } from "./instability";

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
// Mirrors net.ts MODEL — the board's model, kept in sync so the overview and the drill-down agree.
const MODEL = "gfs_seamless";
/** Feed schema version — bumped on any breaking change to the JSON shape, so API consumers can
 *  pin to it (published in the /api/v1 path and in meta.json). Additive fields don't bump it. */
export const SCHEMA_VERSION = 1;

/** License line for the API, mirroring the sibling motor.fusionspace.co wording verbatim. */
export const API_LICENSE = "Free to use; attribution appreciated; provided as-is";
/** The files the API serves, in the order the docs list them. */
export const API_ENDPOINTS = [
  "/api/v1/conditions.json",
  "/api/v1/sites.json",
  "/api/v1/meta.json",
  "/api/v1/openapi.json",
];
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
      "relative_humidity_2m,surface_pressure,cape,cloud_cover",
    daily: "wind_speed_10m_max,wind_gusts_10m_max,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    models: MODEL,
    forecast_days: "1",
    timezone: "auto",
  });
  return `${OPEN_METEO}?${p.toString()}`;
}

/** Today's forecast peaks — the day's worst-case at a glance, from the daily aggregates. */
export interface SiteToday {
  max_wind_mph: number | null;
  max_gust_mph: number | null;
  high_f: number | null;
  low_f: number | null;
  precip_chance_pct: number | null;
}

export interface SiteConditions {
  name: string;
  state: string;
  lat: number;
  lon: number;
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

/** Self-describing metadata file, mirroring motor.fusionspace.co's meta.json shape: schema
 *  version, generation time, counts, the endpoint list, docs URL, license, and an honesty note. */
export interface SiteFeedMeta {
  schema_version: number;
  generated_at: string | null;
  model: string;
  counts: { sites: number; states: number };
  endpoints: string[];
  docs: string;
  license: string;
  notes: string;
}

/** The curated field database as its own endpoint (name/state/lat/lon), with zero weather-API
 *  cost — just the static roster. The analogue of motor's vendors.json. */
export interface SitesFile {
  schema_version: number;
  generated_at: string;
  count: number;
  sites: { name: string; state: string; lat: number; lon: number }[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** First value of a daily aggregate array (forecast_days=1 → one element), or null. */
function daily1(v: unknown): number | null {
  return Array.isArray(v) ? num(v[0]) : null;
}

/** Round a usable number to the nearest integer, passing null through. */
function round(v: number | null): number | null {
  return v == null ? null : Math.round(v);
}

/** Round to the nearest `step` (e.g. density altitude to 10 ft — sub-10-ft precision is false). */
function roundTo(v: number | null, step: number): number | null {
  return v == null || !Number.isFinite(v) ? null : Math.round(v / step) * step;
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
): SiteFeed {
  const arr: unknown[] = Array.isArray(raw) ? raw : [raw];
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

    const d = el?.daily;
    const today: SiteToday | null = d
      ? {
          max_wind_mph: round(daily1(d.wind_speed_10m_max)),
          max_gust_mph: round(daily1(d.wind_gusts_10m_max)),
          high_f: round(daily1(d.temperature_2m_max)),
          low_f: round(daily1(d.temperature_2m_min)),
          precip_chance_pct: round(daily1(d.precipitation_probability_max)),
        }
      : null;

    out.push({
      name: s.name,
      state: s.state,
      lat: s.lat,
      lon: s.lon,
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
  };
}

/** Build the static sites.json roster from the curated list. No weather API involved. Pure. */
export function buildSitesFile(generatedAt: string, sites: readonly LaunchSite[] = LAUNCH_SITES): SitesFile {
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: generatedAt,
    count: sites.length,
    sites: sites.map((s) => ({ name: s.name, state: s.state, lat: s.lat, lon: s.lon })),
  };
}
