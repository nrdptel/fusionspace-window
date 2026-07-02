/** Per-device preferences in localStorage under the `window.*` namespace: the units
 *  choice, the optional personal wind line, and saved fields. None of this is part of the
 *  shared URL view; it's local to the browser. The serialise/parse helpers are pure and
 *  tested; the IO wrappers no-op in private mode. */

import { DEFAULT_UNITS, type UnitPrefs } from "./units";

const UNITS_KEY = "window.units";
const WINDLINE_KEY = "window.windline";
const APOGEE_KEY = "window.apogee";
const DESCENT_KEY = "window.descent";
const RECOVERY_KEY = "window.recovery";
const MAINDEPLOY_KEY = "window.maindeploy";
const MAINDESCENT_KEY = "window.maindescent";
const SAVED_KEY = "window.savedFields";
const LAST_KEY = "window.lastField";
const SAVED_LIMIT = 12;

/** Recovery style. "single" = one descent rate the whole way down; "dual" = a fast drogue from
 *  apogee to the main-deploy altitude, then the slow main to the ground (the DESCENT_KEY rate is
 *  the drogue rate in dual mode, MAINDESCENT_KEY the main rate). */
export type RecoveryMode = "single" | "dual";

export interface SavedField {
  lat: number;
  lon: number;
  label: string;
}

/** The field a return visit lands on (label optional — a shared coords-only link has none). */
export interface LastField {
  lat: number;
  lon: number;
  label?: string;
}

// --- units ---
export function parseUnits(raw: string | null): UnitPrefs {
  if (!raw) return DEFAULT_UNITS;
  try {
    const o = JSON.parse(raw) as Partial<UnitPrefs>;
    return {
      system: o.system === "metric" ? "metric" : "imperial",
      windKnots: o.windKnots === true,
    };
  } catch {
    return DEFAULT_UNITS;
  }
}
export function readUnits(): UnitPrefs {
  try {
    return parseUnits(localStorage.getItem(UNITS_KEY));
  } catch {
    return DEFAULT_UNITS;
  }
}
export function writeUnits(u: UnitPrefs): void {
  try {
    localStorage.setItem(UNITS_KEY, JSON.stringify(u));
  } catch {
    /* no-op in private mode */
  }
}

// --- personal wind line (mph) ---
/** A personal surface-wind line, lower than the 20 mph reference, or null for none.
 *  Floored at 0 and capped at the published 20 mph reference (a personal line above the
 *  limit would be meaningless). */
export function parseWindLine(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(20, n);
}
export function readWindLine(): number | null {
  try {
    return parseWindLine(localStorage.getItem(WINDLINE_KEY));
  } catch {
    return null;
  }
}
export function writeWindLine(mph: number | null): void {
  try {
    if (mph == null) localStorage.removeItem(WINDLINE_KEY);
    else localStorage.setItem(WINDLINE_KEY, String(mph));
  } catch {
    /* no-op */
  }
}

// --- expected apogee (feet AGL) ---
/** The flight's planned peak altitude, used to read the cloud ceiling as a go/no-go gate, or
 *  null for none. Kept in feet because that's how US waivers and altimeters talk about altitude
 *  (see model.ts). Floored above 0 and capped at 100,000 ft — well past any US amateur waiver,
 *  so a fat-fingered entry can't produce a nonsense margin. */
export function parseApogee(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(100000, n);
}
export function readApogee(): number | null {
  try {
    return parseApogee(localStorage.getItem(APOGEE_KEY));
  } catch {
    return null;
  }
}
export function writeApogee(ft: number | null): void {
  try {
    if (ft == null) localStorage.removeItem(APOGEE_KEY);
    else localStorage.setItem(APOGEE_KEY, String(ft));
  } catch {
    /* no-op */
  }
}

// --- recovery descent rate (feet per second) ---
/** The main-parachute descent rate, ft/s, used to turn the mean wind aloft into a landing-drift
 *  distance — or null for none. Kept in ft/s because that's the unit rocketry descent rates are
 *  quoted in. Floored above 0 and capped at 200 ft/s (a streamer/ballistic recovery; past that
 *  there's no meaningful drift to read). */
export function parseDescentRate(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(200, n);
}
export function readDescentRate(): number | null {
  try {
    return parseDescentRate(localStorage.getItem(DESCENT_KEY));
  } catch {
    return null;
  }
}
export function writeDescentRate(fps: number | null): void {
  try {
    if (fps == null) localStorage.removeItem(DESCENT_KEY);
    else localStorage.setItem(DESCENT_KEY, String(fps));
  } catch {
    /* no-op */
  }
}

// --- dual-deploy recovery (mode + main-chute deploy altitude + main descent rate) ---
/** Recovery mode, defaulting to single. Any unrecognised value reads as single. */
export function parseRecoveryMode(raw: string | null): RecoveryMode {
  return raw === "dual" ? "dual" : "single";
}
export function readRecoveryMode(): RecoveryMode {
  try {
    return parseRecoveryMode(localStorage.getItem(RECOVERY_KEY));
  } catch {
    return "single";
  }
}
export function writeRecoveryMode(mode: RecoveryMode): void {
  try {
    if (mode === "single") localStorage.removeItem(RECOVERY_KEY);
    else localStorage.setItem(RECOVERY_KEY, mode);
  } catch {
    /* no-op */
  }
}

/** Main-chute deployment altitude, ft AGL — where a dual-deploy switches from drogue to main.
 *  Floored above 0 and capped at 100,000 ft (the caller enforces main < apogee at compute time). */
export function parseMainDeploy(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(100000, n);
}
export function readMainDeploy(): number | null {
  try {
    return parseMainDeploy(localStorage.getItem(MAINDEPLOY_KEY));
  } catch {
    return null;
  }
}
export function writeMainDeploy(ft: number | null): void {
  try {
    if (ft == null) localStorage.removeItem(MAINDEPLOY_KEY);
    else localStorage.setItem(MAINDEPLOY_KEY, String(ft));
  } catch {
    /* no-op */
  }
}

/** Main-parachute descent rate, ft/s (the slow rate a dual-deploy lands under). Same bounds as
 *  the single-deploy rate: floored above 0, capped at 200 ft/s. */
export function parseMainDescentRate(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(200, n);
}
export function readMainDescentRate(): number | null {
  try {
    return parseMainDescentRate(localStorage.getItem(MAINDESCENT_KEY));
  } catch {
    return null;
  }
}
export function writeMainDescentRate(fps: number | null): void {
  try {
    if (fps == null) localStorage.removeItem(MAINDESCENT_KEY);
    else localStorage.setItem(MAINDESCENT_KEY, String(fps));
  } catch {
    /* no-op */
  }
}

// --- saved fields ---
export function parseSaved(raw: string | null): SavedField[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (f): f is SavedField =>
          typeof (f as SavedField)?.lat === "number" &&
          typeof (f as SavedField)?.lon === "number" &&
          typeof (f as SavedField)?.label === "string",
      )
      .slice(0, SAVED_LIMIT);
  } catch {
    return [];
  }
}
export function readSaved(): SavedField[] {
  try {
    return parseSaved(localStorage.getItem(SAVED_KEY));
  } catch {
    return [];
  }
}
export function writeSaved(list: SavedField[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, SAVED_LIMIT)));
  } catch {
    /* no-op */
  }
}

// --- last viewed field (so a bare visit lands on it, not the empty prompt) ---
export function parseLastField(raw: string | null): LastField | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<LastField>;
    if (
      typeof o?.lat === "number" &&
      typeof o?.lon === "number" &&
      Number.isFinite(o.lat) &&
      Number.isFinite(o.lon)
    ) {
      return { lat: o.lat, lon: o.lon, label: typeof o.label === "string" ? o.label : undefined };
    }
  } catch {
    /* ignore */
  }
  return null;
}
export function readLastField(): LastField | null {
  try {
    return parseLastField(localStorage.getItem(LAST_KEY));
  } catch {
    return null;
  }
}
export function writeLastField(f: LastField): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ lat: f.lat, lon: f.lon, label: f.label }));
  } catch {
    /* no-op */
  }
}

/** Add or move a field to the front, de-duped by rounded coordinate. */
export function addSaved(list: SavedField[], field: SavedField): SavedField[] {
  const key = (f: SavedField) => `${f.lat.toFixed(3)},${f.lon.toFixed(3)}`;
  const k = key(field);
  const rest = list.filter((f) => key(f) !== k);
  return [field, ...rest].slice(0, SAVED_LIMIT);
}

export function removeSaved(list: SavedField[], field: SavedField): SavedField[] {
  const key = (f: SavedField) => `${f.lat.toFixed(3)},${f.lon.toFixed(3)}`;
  const k = key(field);
  return list.filter((f) => key(f) !== k);
}
