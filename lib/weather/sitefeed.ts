/** The "all sites at a glance" feed — the current surface wind at every curated launch field,
 *  toned against the 20 mph line, fetched in ONE batched Open-Meteo request rather than one per
 *  field. A scheduled Cloudflare Worker (workers/conditions) calls buildBatchUrl once every few
 *  minutes, runs summarizeSiteFeed over the response, and stores the result as a small JSON feed
 *  the site reads for its overview — so a flyer near several clubs sees which are flyable now
 *  without opening each, and no visitor's browser has to hammer the API for 100+ fields.
 *
 *  Model-only by design: this is the same modeled surface wind the board already shows
 *  (gfs_seamless), NOT observed station data — the live station cross-check stays in the per-field
 *  view. Pure and tested; the fetch/store lives in the Worker. */

import { LAUNCH_SITES, type LaunchSite } from "../launchSites";
import { windTone, type WindTone } from "./limits";

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
// Mirrors net.ts MODEL — the board's model, kept in sync so the overview and the drill-down agree.
const MODEL = "gfs_seamless";

/** One batched current-wind request for every site. Open-Meteo accepts comma-separated
 *  latitude/longitude (up to 1,000 locations) and returns an array of results in the same order,
 *  so all the fields cost a single call. Deliberately tiny — current surface wind and temperature
 *  only, one forecast day — to keep the weighted API cost negligible. */
export function buildBatchUrl(sites: readonly LaunchSite[] = LAUNCH_SITES): string {
  const p = new URLSearchParams({
    latitude: sites.map((s) => s.lat).join(","),
    longitude: sites.map((s) => s.lon).join(","),
    current: "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m",
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    models: MODEL,
    forecast_days: "1",
    timezone: "auto",
  });
  return `${OPEN_METEO}?${p.toString()}`;
}

export interface SiteConditions {
  name: string;
  state: string;
  lat: number;
  lon: number;
  /** Sustained surface wind, mph (10 m). */
  windMph: number;
  /** Gust, mph — null when the model omits it. */
  gustMph: number | null;
  /** Direction the wind blows FROM, degrees. */
  dirDeg: number;
  /** Temperature, °F — null when absent. */
  tempF: number | null;
  /** Tone against the 20 mph line (emerald / amber / red), the default caution band. */
  tone: WindTone;
}

export interface SiteFeed {
  /** ISO timestamp the feed was generated (the fetch time), for the "as of" staleness flag. */
  generatedAt: string;
  /** Model the winds came from (matches the board). */
  model: string;
  /** One entry per site that returned usable wind; sites missing data are omitted. */
  sites: SiteConditions[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Turn a batched Open-Meteo response into the site feed. The response is an array (one element
 *  per location, in request order) — or a single object when only one location was requested.
 *  `generatedAt` is passed in so this stays pure (no clock); the Worker supplies its event time.
 *  Sites whose element is missing or lacks a usable wind are skipped rather than faked. */
export function summarizeSiteFeed(
  raw: unknown,
  generatedAt: string,
  sites: readonly LaunchSite[] = LAUNCH_SITES,
): SiteFeed {
  const arr: unknown[] = Array.isArray(raw) ? raw : [raw];
  const out: SiteConditions[] = [];
  for (let i = 0; i < sites.length; i++) {
    const el = arr[i] as { current?: Record<string, unknown> } | undefined;
    const c = el?.current;
    if (!c) continue;
    const windMph = num(c.wind_speed_10m);
    const dirDeg = num(c.wind_direction_10m);
    if (windMph == null || dirDeg == null) continue;
    const s = sites[i];
    out.push({
      name: s.name,
      state: s.state,
      lat: s.lat,
      lon: s.lon,
      windMph,
      gustMph: num(c.wind_gusts_10m),
      dirDeg,
      tempF: num(c.temperature_2m),
      tone: windTone(windMph),
    });
  }
  return { generatedAt, model: MODEL, sites: out };
}
