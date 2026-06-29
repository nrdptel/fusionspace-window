/** The thin, impure network layer — the only place Window touches the providers. URL
 *  builders are pure (and tested); the fetchers are kept deliberately dumb and never
 *  appear in a unit test. `loadBoard` orchestrates one Open-Meteo forecast (the hard
 *  dependency) plus a best-effort NWS pass for alerts and an observed ceiling, and only
 *  ever throws when Open-Meteo itself fails. NWS is fetched as a plain GET with no
 *  custom headers — a custom User-Agent would trip its CORS preflight in the browser. */

import type { BoardData, Sky } from "./model";
import { parseForecast, PRESSURE_LEVELS, type RawForecast } from "./forecast";
import { summarizeClimatology, type RawArchive } from "./climatology";
import { parseAirQuality } from "./airquality";
import { parseWindPeek, type WindPeek } from "./peek";
import { parseAlerts } from "./alerts";
import { parseGeocode, type Place } from "./geocode";
import {
  haversineMiles,
  modelSky,
  parseObservation,
  parseStations,
  stationSky,
} from "./metar";

export const MODEL = "gfs_seamless";
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality";
const NWS = "https://api.weather.gov";

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "cape",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
];

const HOURLY_SURFACE = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "cloud_cover_low",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "is_day",
  "cape",
  "visibility",
  "freezing_level_height",
];

const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "cloud_cover_mean",
  "sunrise",
  "sunset",
  "daylight_duration",
];

function aloftVars(): string[] {
  const out: string[] = [];
  for (const p of PRESSURE_LEVELS) {
    out.push(`wind_speed_${p}hPa`, `wind_direction_${p}hPa`, `geopotential_height_${p}hPa`);
  }
  return out;
}

/** Build the single Open-Meteo forecast request — current + hourly + daily surface, plus
 *  pressure-level winds for the aloft profile. Imperial units, US-optimised GFS/HRRR. */
export function buildForecastUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: CURRENT_VARS.join(","),
    hourly: [...HOURLY_SURFACE, ...aloftVars()].join(","),
    daily: DAILY_VARS.join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    models: MODEL,
    forecast_days: "7",
  });
  return `${OPEN_METEO}?${p.toString()}`;
}

export function buildGeocodeUrl(query: string): string {
  const p = new URLSearchParams({
    name: query,
    count: "6",
    language: "en",
    format: "json",
  });
  return `${GEOCODING}?${p.toString()}`;
}

/** A daily-max wind/gust history for the seasonal normal. Imperial wind to match the board. */
export function buildArchiveUrl(lat: number, lon: number, startDate: string, endDate: string): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date: endDate,
    daily: "wind_speed_10m_max,wind_gusts_10m_max",
    wind_speed_unit: "mph",
    timezone: "auto",
  });
  return `${ARCHIVE}?${p.toString()}`;
}

/** Current air quality (US AQI + smoke/dust particulate). Best-effort, like the archive. */
export function buildAirQualityUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "us_aqi,pm2_5,pm10",
    timezone: "auto",
  });
  return `${AIR_QUALITY}?${p.toString()}`;
}

/** A minimal current-wind request for the saved-fields glance. */
export function buildWindPeekUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    wind_speed_unit: "mph",
    models: MODEL,
    forecast_days: "1",
  });
  return `${OPEN_METEO}?${p.toString()}`;
}

/** Current surface wind for one field, best-effort — null on any failure. */
export async function fetchWindPeek(lat: number, lon: number): Promise<WindPeek | null> {
  try {
    return parseWindPeek(await fetchJson(buildWindPeekUrl(lat, lon), 8_000));
  } catch {
    return null;
  }
}

/** A ~`years`-long archive window ending a week back (the archive lags real-time). */
function archiveRange(years = 5): { start: string; end: string } {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 7);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - years);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

/** NWS wants ≤4 decimals on a point or it 301-redirects. */
function roundCoord(n: number): string {
  return n.toFixed(4);
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// --- public fetchers --------------------------------------------------------------

export async function fetchGeocode(query: string): Promise<Place[]> {
  const raw = await fetchJson(buildGeocodeUrl(query.trim()), 10_000);
  return parseGeocode(raw);
}

interface NwsPoint {
  stationsUrl?: string;
  label?: string;
}

async function fetchNwsPoint(lat: number, lon: number): Promise<NwsPoint> {
  const raw = (await fetchJson(`${NWS}/points/${roundCoord(lat)},${roundCoord(lon)}`, 8_000)) as {
    properties?: {
      observationStations?: string;
      relativeLocation?: { properties?: { city?: string; state?: string } };
    };
  };
  const rel = raw.properties?.relativeLocation?.properties;
  const label = rel?.city ? (rel.state ? `${rel.city}, ${rel.state}` : rel.city) : undefined;
  return { stationsUrl: raw.properties?.observationStations, label };
}

/** Walk the nearest few stations and return the first with a usable sky observation. */
async function fetchStationSky(
  lat: number,
  lon: number,
  stationsUrl: string,
): Promise<Sky | null> {
  const raw = await fetchJson(stationsUrl, 8_000);
  const stations = parseStations(raw).slice(0, 4);
  for (const st of stations) {
    try {
      const obsRaw = await fetchJson(
        `${NWS}/stations/${st.id}/observations/latest`,
        8_000,
      );
      const obs = parseObservation(obsRaw);
      if (obs.usable) {
        return stationSky(st, haversineMiles({ lat, lon }, st), obs);
      }
    } catch {
      /* try the next station */
    }
  }
  return null;
}

// --- orchestration ----------------------------------------------------------------

/** Load a whole board for a field. Open-Meteo is required; NWS degrades to nothing
 *  (alerts) or a modeled sky. Throws only when the Open-Meteo forecast fails. */
export async function loadBoard(
  lat: number,
  lon: number,
  label?: string,
): Promise<BoardData> {
  // Forecast (required) and the NWS point (for label + stations) run together.
  const forecastP = fetchJson(buildForecastUrl(lat, lon), 15_000) as Promise<RawForecast>;
  const pointP = fetchNwsPoint(lat, lon).catch(() => ({}) as NwsPoint);
  const alertsP = fetchJson(`${NWS}/alerts/active?point=${roundCoord(lat)},${roundCoord(lon)}`, 8_000)
    .then((raw) => parseAlerts(raw))
    .catch(() => null);
  // Seasonal normal — best-effort, like NWS; the board renders fine without it.
  const range = archiveRange();
  const archiveP = fetchJson(buildArchiveUrl(lat, lon, range.start, range.end), 10_000).catch(() => null);
  // Air quality / smoke — best-effort, the same posture; null on any failure.
  const airQualityP = fetchJson(buildAirQualityUrl(lat, lon), 8_000)
    .then((raw) => parseAirQuality(raw))
    .catch(() => null);

  const raw = await forecastP;
  const point = await pointP;

  const skyP = point.stationsUrl
    ? fetchStationSky(lat, lon, point.stationsUrl).catch(() => null)
    : Promise.resolve(null);

  const [stationSkyResult, alerts, archiveRaw, airQuality] = await Promise.all([
    skyP,
    alertsP,
    archiveP,
    airQualityP,
  ]);

  const forecast = parseForecast(raw, MODEL, label ?? point.label);
  const sky = stationSkyResult ?? modelSky(forecast.current.cloudCoverPct);
  const climatology = archiveRaw
    ? summarizeClimatology(archiveRaw as RawArchive, forecast.current.time)
    : null;

  return { forecast, sky, alerts, climatology, airQuality, fetchedAt: Date.now() };
}
