/** Open-Meteo Forecast response → Window's view model. Pure and defensive: the API can
 *  null individual cells (a model gap, a level below ground), so every read is guarded
 *  and a missing figure is dropped rather than rendered as zero.
 *
 *  The one derivation that needs care is the winds-aloft AGL height. Open-Meteo always
 *  reports `elevation` in metres, but the geopotential-height unit varies with the unit
 *  request (it can come back in feet or metres), so we read the reported unit per field
 *  and normalise everything to feet before subtracting the field's ground level. */

import { FT_PER_M, M_PER_MILE } from "../units";
import type {
  AloftLevel,
  AloftProfile,
  CurrentConditions,
  DayOutlook,
  Field,
  Forecast,
  HourPoint,
} from "./model";

/** Pressure levels we request, dense low (where recovery cares) and coarse high. */
export const PRESSURE_LEVELS = [
  1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250,
] as const;

export interface RawForecast {
  latitude: number;
  longitude: number;
  /** Field ground elevation, always metres. */
  elevation: number;
  timezone: string;
  utc_offset_seconds: number;
  current_units?: Record<string, string>;
  current?: Record<string, number | string>;
  hourly_units?: Record<string, string>;
  hourly?: Record<string, Array<number | string | null>>;
  daily_units?: Record<string, string>;
  daily?: Record<string, Array<number | string | null>>;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Normalise a height to feet given the unit string the API reported for it. */
export function heightToFeet(value: number, unit: string | undefined): number {
  const u = (unit ?? "").toLowerCase();
  if (u === "ft" || u === "feet") return value;
  // Default and explicit metres → feet.
  return value * FT_PER_M;
}

/** Normalise a visibility to statute miles given the unit the API reported for it.
 *  Open-Meteo reports visibility in metres (it ignores the imperial request); guard for
 *  a feet response just in case. */
export function visibilityToMiles(value: number, unit: string | undefined): number {
  const u = (unit ?? "").toLowerCase();
  if (u === "ft" || u === "feet") return (value / FT_PER_M) / M_PER_MILE;
  if (u === "mi" || u === "mile" || u === "miles") return value;
  // Default and explicit metres → miles.
  return value / M_PER_MILE;
}

function buildField(raw: RawForecast, label?: string): Field {
  return {
    lat: raw.latitude,
    lon: raw.longitude,
    label,
    elevationFt: (num(raw.elevation) ?? 0) * FT_PER_M,
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,
  };
}

function buildCurrent(raw: RawForecast): CurrentConditions {
  const c = raw.current ?? {};
  return {
    time: String(c.time ?? ""),
    tempF: num(c.temperature_2m) ?? NaN,
    apparentF: num(c.apparent_temperature) ?? NaN,
    humidityPct: num(c.relative_humidity_2m) ?? NaN,
    windMph: num(c.wind_speed_10m) ?? NaN,
    gustMph: num(c.wind_gusts_10m) ?? NaN,
    dirDeg: num(c.wind_direction_10m) ?? NaN,
    cloudCoverPct: num(c.cloud_cover) ?? NaN,
    precipIn: num(c.precipitation) ?? 0,
    weatherCode: num(c.weather_code) ?? 0,
    isDay: num(c.is_day) !== 0,
    pressureMslHpa: num(c.pressure_msl) ?? NaN,
    surfacePressureHpa: num(c.surface_pressure) ?? NaN,
    capeJkg: num(c.cape) ?? NaN,
  };
}

function buildHourly(raw: RawForecast): HourPoint[] {
  const h = raw.hourly ?? {};
  const units = raw.hourly_units ?? {};
  const time = (h.time ?? []) as string[];
  return time.map((t, i) => ({
    time: t,
    tempF: num(h.temperature_2m?.[i]) ?? NaN,
    humidityPct: num(h.relative_humidity_2m?.[i]) ?? NaN,
    surfacePressureHpa: num(h.surface_pressure?.[i]) ?? NaN,
    windMph: num(h.wind_speed_10m?.[i]) ?? NaN,
    gustMph: num(h.wind_gusts_10m?.[i]) ?? NaN,
    dirDeg: num(h.wind_direction_10m?.[i]) ?? NaN,
    precipProbPct: num(h.precipitation_probability?.[i]),
    precipIn: num(h.precipitation?.[i]) ?? 0,
    cloudCoverPct: num(h.cloud_cover?.[i]) ?? NaN,
    weatherCode: num(h.weather_code?.[i]) ?? 0,
    // `is_day` is absent on some models; default to daytime so a calm window is
    // never wrongly hidden as "after dark".
    isDay: num(h.is_day?.[i]) !== 0,
    capeJkg: num(h.cape?.[i]) ?? NaN,
    visibilityMi: (() => {
      const v = num(h.visibility?.[i]);
      return v == null ? NaN : visibilityToMiles(v, units.visibility);
    })(),
  }));
}

/** One vertical profile per hourly time, parallel to `hourly`. Levels below the field
 *  (negative AGL) are dropped; the rest are sorted ascending by height. */
function buildAloft(raw: RawForecast, field: Field): AloftProfile[] {
  const h = raw.hourly ?? {};
  const units = raw.hourly_units ?? {};
  const time = (h.time ?? []) as string[];

  return time.map((t, i) => {
    const levels: AloftLevel[] = [];
    for (const p of PRESSURE_LEVELS) {
      const ws = num(h[`wind_speed_${p}hPa`]?.[i]);
      const dir = num(h[`wind_direction_${p}hPa`]?.[i]);
      const gh = num(h[`geopotential_height_${p}hPa`]?.[i]);
      if (ws == null || dir == null || gh == null) continue;
      const mslFt = heightToFeet(gh, units[`geopotential_height_${p}hPa`]);
      const aglFt = mslFt - field.elevationFt;
      if (aglFt < 0) continue; // level is below the field — underground here
      levels.push({ pressureHpa: p, aglFt, mslFt, windMph: ws, dirDeg: dir });
    }
    levels.sort((a, b) => a.aglFt - b.aglFt);

    // 0°C level: reported MSL, expressed as height above the field. Below-field (already
    // freezing at the surface) or absent → NaN, and the chart simply doesn't draw it.
    const fl = num(h.freezing_level_height?.[i]);
    let freezingLevelAglFt = NaN;
    if (fl != null) {
      const aglFt = heightToFeet(fl, units.freezing_level_height) - field.elevationFt;
      freezingLevelAglFt = aglFt > 0 ? aglFt : NaN;
    }

    return { time: t, levels, freezingLevelAglFt };
  });
}

function buildDaily(raw: RawForecast): DayOutlook[] {
  const d = raw.daily ?? {};
  const time = (d.time ?? []) as string[];
  return time.map((date, i) => ({
    date,
    weatherCode: num(d.weather_code?.[i]) ?? 0,
    tempMaxF: num(d.temperature_2m_max?.[i]) ?? NaN,
    tempMinF: num(d.temperature_2m_min?.[i]) ?? NaN,
    precipSumIn: num(d.precipitation_sum?.[i]) ?? 0,
    precipProbMaxPct: num(d.precipitation_probability_max?.[i]),
    windMaxMph: num(d.wind_speed_10m_max?.[i]) ?? NaN,
    gustMaxMph: num(d.wind_gusts_10m_max?.[i]) ?? NaN,
    windDirDeg: num(d.wind_direction_10m_dominant?.[i]) ?? NaN,
    cloudCoverMeanPct: num(d.cloud_cover_mean?.[i]),
    sunrise: typeof d.sunrise?.[i] === "string" ? (d.sunrise[i] as string) : null,
    sunset: typeof d.sunset?.[i] === "string" ? (d.sunset[i] as string) : null,
  }));
}

export function parseForecast(raw: RawForecast, model: string, label?: string): Forecast {
  const field = buildField(raw, label);
  return {
    field,
    current: buildCurrent(raw),
    hourly: buildHourly(raw),
    aloftHourly: buildAloft(raw, field),
    daily: buildDaily(raw),
    model,
  };
}
