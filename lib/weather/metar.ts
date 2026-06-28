/** NWS observation + station parsing for the sky panel. NWS is a graceful-degradation
 *  enhancement, not a dependency: this turns a nearby station's latest observation into
 *  an observed ceiling/coverage, and provides the "is this observation usable" test the
 *  network layer uses to skip automated stations (RAWS sites) that report no cloud
 *  layers. All pure; the actual multi-station fetch lives in net.ts. NWS reports SI, so
 *  cloud-layer bases (metres) are converted to feet. */

import { FT_PER_M, KMH_PER_MPH, M_PER_MILE, MS_PER_MPH } from "../units";
import type { CloudLayer, Sky } from "./model";

export interface RawStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface NwsValue {
  unitCode?: string;
  value: number | null;
}

interface RawObservation {
  timestamp?: string;
  textDescription?: string;
  visibility?: NwsValue;
  windSpeed?: NwsValue;
  windDirection?: NwsValue;
  windGust?: NwsValue;
  rawMessage?: string;
  cloudLayers?: { base?: NwsValue; amount?: string }[];
}

/** NWS reports visibility in metres; convert to statute miles, or null when absent. */
function visibilityMiles(v: NwsValue | undefined): number | null {
  return typeof v?.value === "number" && Number.isFinite(v.value) ? v.value / M_PER_MILE : null;
}

/** NWS reports wind in km/h (sometimes m/s); convert to mph, or null when absent. */
function windToMph(v: NwsValue | undefined): number | null {
  if (typeof v?.value !== "number" || !Number.isFinite(v.value)) return null;
  const unit = (v.unitCode ?? "").toLowerCase();
  if (unit.includes("m_s") || unit.includes("m/s")) return v.value / MS_PER_MPH;
  // Default and explicit km/h.
  return v.value / KMH_PER_MPH;
}

function dirDeg(v: NwsValue | undefined): number | null {
  return typeof v?.value === "number" && Number.isFinite(v.value) ? v.value : null;
}

/** Stations from a `/gridpoints/.../stations` feature collection, in NWS's order
 *  (roughly nearest first). */
export function parseStations(raw: unknown): RawStation[] {
  const features = (raw as { features?: unknown[] })?.features ?? [];
  const out: RawStation[] = [];
  for (const f of features) {
    const ff = f as {
      properties?: { stationIdentifier?: string; name?: string };
      geometry?: { coordinates?: number[] };
    };
    const id = ff.properties?.stationIdentifier;
    const coords = ff.geometry?.coordinates;
    if (!id || !coords || coords.length < 2) continue;
    out.push({
      id,
      name: ff.properties?.name ?? id,
      lon: coords[0],
      lat: coords[1],
    });
  }
  return out;
}

/** Great-circle distance in statute miles. */
export function haversineMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 3958.7613; // mean Earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const CEILING_AMOUNTS = new Set(["BKN", "OVC", "VV"]);

export interface ParsedObservation {
  time: string;
  layers: CloudLayer[];
  ceilingFt: number | null;
  /** Observed horizontal visibility, statute miles — null when absent. */
  visibilityMi: number | null;
  /** Observed surface wind (mph) / gust (mph) / direction (FROM, deg) — null when absent. */
  windMph: number | null;
  gustMph: number | null;
  windDirDeg: number | null;
  /** The raw METAR string, when the station reports one. */
  raw: string | null;
  description: string;
  /** True when the observation actually carries sky data we can show. */
  usable: boolean;
}

/** Parse a `/observations/latest` properties object into cloud layers + a ceiling. */
export function parseObservation(raw: unknown): ParsedObservation {
  const p = (raw as { properties?: RawObservation })?.properties ?? (raw as RawObservation) ?? {};
  const layers: CloudLayer[] = (p.cloudLayers ?? []).map((l) => ({
    amount: (l.amount ?? "").toUpperCase(),
    baseFt:
      typeof l.base?.value === "number" && Number.isFinite(l.base.value)
        ? l.base.value * FT_PER_M
        : null,
  }));
  // Ceiling = lowest broken/overcast (or vertical-visibility) base.
  let ceilingFt: number | null = null;
  for (const l of layers) {
    if (CEILING_AMOUNTS.has(l.amount) && l.baseFt != null) {
      ceilingFt = ceilingFt == null ? l.baseFt : Math.min(ceilingFt, l.baseFt);
    }
  }
  const description = (p.textDescription ?? "").trim() || summarizeLayers(layers);
  const usable = layers.length > 0 || Boolean((p.textDescription ?? "").trim());
  const rawMsg = typeof p.rawMessage === "string" && p.rawMessage.trim() ? p.rawMessage.trim() : null;
  return {
    time: p.timestamp ?? "",
    layers,
    ceilingFt,
    visibilityMi: visibilityMiles(p.visibility),
    windMph: windToMph(p.windSpeed),
    gustMph: windToMph(p.windGust),
    windDirDeg: dirDeg(p.windDirection),
    raw: rawMsg,
    description,
    usable,
  };
}

/** A plain-words sky summary from cloud layers when the station gives no text. */
export function summarizeLayers(layers: CloudLayer[]): string {
  if (layers.length === 0) return "—";
  const top = layers.reduce((acc, l) => Math.max(acc, rank(l.amount)), 0);
  switch (top) {
    case 4:
      return "Overcast";
    case 3:
      return "Broken clouds";
    case 2:
      return "Scattered clouds";
    case 1:
      return "Few clouds";
    default:
      return "Clear";
  }
}

function rank(amount: string): number {
  switch (amount) {
    case "OVC":
    case "VV":
      return 4;
    case "BKN":
      return 3;
    case "SCT":
      return 2;
    case "FEW":
      return 1;
    default:
      return 0; // CLR / SKC
  }
}

/** Build the observed (station) sky from a chosen station + its parsed observation. */
export function stationSky(
  station: RawStation,
  distanceMi: number | null,
  obs: ParsedObservation,
): Sky {
  return {
    source: "station",
    station: { id: station.id, name: station.name, distanceMi, time: obs.time },
    ceilingFt: obs.ceilingFt,
    visibilityMi: obs.visibilityMi,
    observedWindMph: obs.windMph,
    observedGustMph: obs.gustMph,
    observedWindDirDeg: obs.windDirDeg,
    raw: obs.raw,
    layers: obs.layers,
    description: obs.description,
  };
}

/** The modeled-sky fallback when no station observation is usable. */
export function modelSky(cloudCoverPct: number): Sky {
  return { source: "model", cloudCoverPct };
}
