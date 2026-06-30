/** NWS observation + station parsing for the sky panel. NWS is a graceful-degradation
 *  enhancement, not a dependency: this turns a nearby station's latest observation into
 *  an observed ceiling/coverage, and provides the "is this observation usable" test the
 *  network layer uses to skip automated stations (RAWS sites) that report no cloud
 *  layers. All pure; the actual multi-station fetch lives in net.ts. NWS reports SI, so
 *  cloud-layer bases (metres) are converted to feet.
 *
 *  The structured `cloudLayers` array is primary, but the NWS API sometimes returns it
 *  EMPTY even when the raw METAR clearly reports the sky — a bare "CLR", or a layer like
 *  "SCT030"/"BKN015". Left unhandled that skips the nearest station on exactly the clear
 *  days people fly (its near-field wind/visibility lost to a station 20+ miles out), and
 *  can drop a real BKN/OVC ceiling the structured field omitted. So when `cloudLayers` is
 *  empty we parse the METAR sky group as a fallback. A genuine no-sky RAWS (no rawMessage
 *  at all) still reads unusable. */

import { FT_PER_M, KMH_PER_MPH, M_PER_MILE, MS_PER_MPH } from "../units";
import type { CloudLayer, PresentWeather, Sky } from "./model";

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
  presentWeather?: NwsPresentWeather[];
}

/** One entry in the NWS observation `presentWeather` array (the structured METAR weather group). */
interface NwsPresentWeather {
  /** "light" | "heavy" — null/absent means moderate. */
  intensity?: string | null;
  /** e.g. "vicinity" | "showers" | "freezing" | "blowing" | "patches". */
  modifier?: string | null;
  /** The phenomenon, lowercase: "rain" | "thunderstorms" | "haze" | "smoke" | "fog" | … */
  weather?: string | null;
  /** The raw METAR token, e.g. "TSRA" | "-RA" | "VCTS" | "HZ". */
  rawString?: string | null;
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

// --- present weather (the observed METAR weather group) ---
// Falling water/ice — a launch no-go under the safety code. NWS `weather` enum values.
const PRECIP = new Set([
  "rain", "drizzle", "snow", "snow_grains", "snow_pellets", "ice_pellets",
  "ice_crystals", "hail", "small_hail",
]);
// Visibility obscurations — they don't stop a launch but cut the sight you need to track it.
const OBSCURE = new Set([
  "fog", "fog_mist", "mist", "haze", "smoke", "dust", "sand", "dust_storm",
  "sand_storm", "dust_whirls", "volcanic_ash", "spray",
]);
// A nicer word for the phenomenon than the raw enum value, where it helps.
const WX_WORD: Record<string, string> = {
  thunderstorms: "thunderstorm", thunderstorm: "thunderstorm", fog_mist: "mist",
  ice_pellets: "ice pellets", ice_crystals: "ice crystals", snow_grains: "snow grains",
  snow_pellets: "snow pellets", dust_storm: "dust storm", sand_storm: "sandstorm",
  dust_whirls: "dust whirls", volcanic_ash: "volcanic ash", funnel_cloud: "funnel cloud",
};

const titleCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A human label for one present-weather entry, e.g. "Light rain", "Nearby thunderstorm". */
function phenomenonLabel(e: NwsPresentWeather): string {
  const raw = (e.weather ?? "").toLowerCase();
  const word = WX_WORD[raw] ?? (raw ? raw.replace(/_/g, " ") : (e.rawString ?? "").trim());
  if (!word) return "";
  const parts: string[] = [];
  if (e.modifier === "vicinity") parts.push("nearby");
  if (e.intensity === "light") parts.push("light");
  else if (e.intensity === "heavy") parts.push("heavy");
  if (e.modifier === "freezing") parts.push("freezing");
  if (e.modifier === "blowing") parts.push("blowing");
  let label = (parts.length ? parts.join(" ") + " " : "") + word;
  if (e.modifier === "showers") label += " showers";
  return titleCase(label.trim());
}

/** Turn the NWS `presentWeather` array into a toned, flagged read — or null when nothing is
 *  reported. Thunderstorm and precipitation are launch no-go items under the Tripoli/NAR code;
 *  obscurations cut the visibility the same code's "observe the whole flight" rule needs. */
export function parsePresentWeather(entries: NwsPresentWeather[] | undefined | null): PresentWeather | null {
  const list = (entries ?? []).filter((e) => (e?.weather ?? "").trim() || (e?.rawString ?? "").trim());
  if (list.length === 0) return null;
  let thunderstorm = false;
  let precip = false;
  let obscuration = false;
  const labels: string[] = [];
  for (const e of list) {
    const w = (e.weather ?? "").toLowerCase();
    const rawTok = (e.rawString ?? "").toUpperCase();
    if (w.startsWith("thunder") || rawTok.includes("TS")) thunderstorm = true;
    if (PRECIP.has(w)) precip = true;
    if (OBSCURE.has(w)) obscuration = true;
    const label = phenomenonLabel(e);
    if (label) labels.push(label);
  }
  if (labels.length === 0) return null;
  const tone = thunderstorm || precip ? "red" : obscuration ? "amber" : "emerald";
  return { labels, thunderstorm, precip, obscuration, tone };
}

/** Cloud groups (FEW/SCT/BKN/OVC/VV + height in hundreds of feet AGL) from a raw METAR. */
const SKY_GROUP = /\b(VV|FEW|SCT|BKN|OVC)(\d{3})\b/g;
/** Explicit clear-sky tokens: clear, sky clear, no significant/detected cloud, CAVOK. */
const CLEAR_SKY = /\b(CLR|SKC|NSC|NCD|CAVOK)\b/;

export interface MetarSky {
  layers: CloudLayer[];
  /** The METAR explicitly reported clear / no-significant-cloud. */
  clear: boolean;
}

/** Parse the sky section of a raw METAR — the fallback when the structured `cloudLayers`
 *  array is empty. Heights in a METAR cloud group are hundreds of feet AGL (BKN015 →
 *  1,500 ft). Only the body is scanned, never the remarks after `RMK`. */
export function parseMetarSky(raw: string): MetarSky {
  const body = raw.split(" RMK")[0];
  const layers: CloudLayer[] = [];
  SKY_GROUP.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SKY_GROUP.exec(body)) !== null) {
    layers.push({ amount: m[1], baseFt: Number(m[2]) * 100 });
  }
  return { layers, clear: layers.length === 0 && CLEAR_SKY.test(body) };
}

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
  /** Observed present-weather phenomena (thunderstorm / precip / obscuration), or null. */
  presentWeather: PresentWeather | null;
  /** True when the observation actually carries sky data we can show. */
  usable: boolean;
}

/** Parse a `/observations/latest` properties object into cloud layers + a ceiling. */
export function parseObservation(raw: unknown): ParsedObservation {
  const p = (raw as { properties?: RawObservation })?.properties ?? (raw as RawObservation) ?? {};
  const rawMsg = typeof p.rawMessage === "string" && p.rawMessage.trim() ? p.rawMessage.trim() : null;

  let layers: CloudLayer[] = (p.cloudLayers ?? []).map((l) => ({
    amount: (l.amount ?? "").toUpperCase(),
    baseFt:
      typeof l.base?.value === "number" && Number.isFinite(l.base.value)
        ? l.base.value * FT_PER_M
        : null,
  }));
  // When the structured array is empty but a raw METAR is present, recover the sky from it —
  // the NWS API drops cloudLayers on plenty of CLR / scattered / even ceiling reports.
  let clear = false;
  if (layers.length === 0 && rawMsg) {
    const sky = parseMetarSky(rawMsg);
    layers = sky.layers;
    clear = sky.clear;
  }

  // Ceiling = lowest broken/overcast (or vertical-visibility) base.
  let ceilingFt: number | null = null;
  for (const l of layers) {
    if (CEILING_AMOUNTS.has(l.amount) && l.baseFt != null) {
      ceilingFt = ceilingFt == null ? l.baseFt : Math.min(ceilingFt, l.baseFt);
    }
  }

  const text = (p.textDescription ?? "").trim();
  const description = text || (layers.length ? summarizeLayers(layers) : clear ? "Clear" : "—");
  const presentWeather = parsePresentWeather(p.presentWeather);
  // Usable for the sky panel when it carries cloud layers, a text summary, an explicit
  // clear-sky report, or reported present weather — but not a bare station that says nothing.
  const usable = layers.length > 0 || Boolean(text) || clear || presentWeather != null;
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
    presentWeather,
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
    presentWeather: obs.presentWeather,
  };
}

/** The modeled-sky fallback when no station observation is usable. */
export function modelSky(cloudCoverPct: number): Sky {
  return { source: "model", cloudCoverPct };
}
