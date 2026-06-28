/** The thin, impure network layer — the only place Window touches the providers. URL
 *  builders are pure (and tested); the fetchers are kept deliberately dumb and never
 *  appear in a unit test. `loadBoard` orchestrates one Open-Meteo forecast (the hard
 *  dependency) plus a best-effort NWS pass for alerts and an observed ceiling, and only
 *  ever throws when Open-Meteo itself fails. NWS is fetched as a plain GET with no
 *  custom headers — a custom User-Agent would trip its CORS preflight in the browser. */

import type { BoardData, Sky } from "./model";
import { parseForecast, PRESSURE_LEVELS, type RawForecast } from "./forecast";
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
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "is_day",
  "cape",
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

  const raw = await forecastP;
  const point = await pointP;

  const skyP = point.stationsUrl
    ? fetchStationSky(lat, lon, point.stationsUrl).catch(() => null)
    : Promise.resolve(null);

  const [stationSkyResult, alerts] = await Promise.all([skyP, alertsP]);

  const forecast = parseForecast(raw, MODEL, label ?? point.label);
  const sky = stationSkyResult ?? modelSky(forecast.current.cloudCoverPct);

  return { forecast, sky, alerts, fetchedAt: Date.now() };
}
