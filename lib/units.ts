/**
 * Unit handling. Window stores every figure in the imperial units Open-Meteo is asked
 * for — wind in mph, heights in feet, temperature in °F, precip in inches — and converts
 * only at display time. The toggle is therefore a pure transform over the stored view
 * model and never touches the network. Knots are offered for wind because aviation and
 * many flyers think in them.
 */

export type System = "imperial" | "metric";
export type WindUnit = "mph" | "kn" | "kmh" | "ms";
export type TempUnit = "F" | "C";
export type LengthUnit = "ft" | "m";
export type PrecipUnit = "in" | "mm";

export interface UnitPrefs {
  system: System;
  /** Override wind to knots regardless of system. */
  windKnots: boolean;
}

export const DEFAULT_UNITS: UnitPrefs = { system: "imperial", windKnots: false };

// --- conversion constants ---------------------------------------------------------
export const FT_PER_M = 3.280839895;
export const KMH_PER_MPH = 1.609344;
export const KN_PER_MPH = 0.868976242;
export const MS_PER_MPH = 0.44704;
export const MM_PER_IN = 25.4;

/** Resolve the active wind/temperature/length/precip units from the saved prefs. */
export function resolveUnits(p: UnitPrefs): {
  wind: WindUnit;
  temp: TempUnit;
  length: LengthUnit;
  precip: PrecipUnit;
} {
  const metric = p.system === "metric";
  return {
    wind: p.windKnots ? "kn" : metric ? "kmh" : "mph",
    temp: metric ? "C" : "F",
    length: metric ? "m" : "ft",
    precip: metric ? "mm" : "in",
  };
}

// --- wind (canonical mph) ---------------------------------------------------------
export const WIND_LABEL: Record<WindUnit, string> = { mph: "mph", kn: "kn", kmh: "km/h", ms: "m/s" };
export function windFromMph(mph: number, unit: WindUnit): number {
  switch (unit) {
    case "kn":
      return mph * KN_PER_MPH;
    case "kmh":
      return mph * KMH_PER_MPH;
    case "ms":
      return mph * MS_PER_MPH;
    default:
      return mph;
  }
}

// --- temperature (canonical °F) ---------------------------------------------------
export const TEMP_LABEL: Record<TempUnit, string> = { F: "°F", C: "°C" };
export function tempFromF(f: number, unit: TempUnit): number {
  return unit === "C" ? ((f - 32) * 5) / 9 : f;
}

// --- length / altitude (canonical ft) ---------------------------------------------
export const LENGTH_LABEL: Record<LengthUnit, string> = { ft: "ft", m: "m" };
export function lengthFromFt(ft: number, unit: LengthUnit): number {
  return unit === "m" ? ft / FT_PER_M : ft;
}

// --- precip (canonical in) --------------------------------------------------------
export const PRECIP_LABEL: Record<PrecipUnit, string> = { in: "in", mm: "mm" };
export function precipFromIn(inches: number, unit: PrecipUnit): number {
  return unit === "mm" ? inches * MM_PER_IN : inches;
}

// --- direction --------------------------------------------------------------------
const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

/** 16-point compass label for a FROM-direction in degrees. */
export function degToCompass(deg: number): string {
  if (!Number.isFinite(deg)) return "—";
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return COMPASS_16[idx];
}

/** Helpers that convert AND round for display, trimming trailing zeros. */
export function fmtWind(mph: number, unit: WindUnit, decimals = 0): string {
  return trim(windFromMph(mph, unit), decimals);
}
export function fmtTemp(f: number, unit: TempUnit, decimals = 0): string {
  return trim(tempFromF(f, unit), decimals);
}
export function fmtLength(ft: number, unit: LengthUnit, decimals = 0): string {
  return trim(lengthFromFt(ft, unit), decimals);
}
export function fmtPrecip(inches: number, unit: PrecipUnit, decimals = 2): string {
  return trim(precipFromIn(inches, unit), decimals);
}

function trim(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return "—";
  const f = 10 ** decimals;
  const r = Math.round(n * f) / f;
  // Pin the locale so server and client first paint match (no hydration mismatch).
  return r.toLocaleString("en-US", { maximumFractionDigits: decimals });
}
