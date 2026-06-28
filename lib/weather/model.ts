/** The view model Window renders. Everything here is plain data derived from the
 *  providers by the pure parsers in this folder; the components never see a raw API
 *  response. Stored units are the imperial units Open-Meteo is asked for — wind in
 *  mph, heights in feet, temperature in °F, precip in inches — and the units toggle
 *  is a pure display conversion on top (see lib/units.ts). Heights are feet because
 *  that is how US flyers and waivers talk about altitude. */

export interface Field {
  lat: number;
  lon: number;
  /** Human place label when we have one (from geocoding or NWS relativeLocation). */
  label?: string;
  /** Field ground elevation in feet — the datum the winds-aloft AGL is measured from. */
  elevationFt: number;
  timezone: string;
  utcOffsetSeconds: number;
}

export interface CurrentConditions {
  /** Valid time, ISO local-naive as the API reports it (no zone suffix). */
  time: string;
  tempF: number;
  apparentF: number;
  humidityPct: number;
  windMph: number;
  gustMph: number;
  /** Direction the wind blows FROM, degrees (meteorological convention). */
  dirDeg: number;
  cloudCoverPct: number;
  precipIn: number;
  weatherCode: number;
  isDay: boolean;
  pressureMslHpa: number;
  /** Actual pressure at the field (station pressure), hPa — the input for density altitude. */
  surfacePressureHpa: number;
  /** Convective available potential energy, J/kg — convective (thunderstorm) instability. */
  capeJkg: number;
}

export interface HourPoint {
  time: string;
  tempF: number;
  /** Relative humidity, % — with temp and pressure, the input for this hour's density altitude. */
  humidityPct: number;
  /** Station pressure at the field, hPa. */
  surfacePressureHpa: number;
  windMph: number;
  gustMph: number;
  dirDeg: number;
  precipProbPct: number | null;
  precipIn: number;
  cloudCoverPct: number;
  weatherCode: number;
  /** Daylight at this hour (Open-Meteo `is_day`). */
  isDay: boolean;
  /** Convective available potential energy, J/kg. */
  capeJkg: number;
  /** Horizontal visibility, statute miles (modeled). NaN when the model omits it. */
  visibilityMi: number;
}

export interface AloftLevel {
  pressureHpa: number;
  /** Height above the field's ground level, feet. */
  aglFt: number;
  /** Geopotential height (above sea level), feet. */
  mslFt: number;
  windMph: number;
  /** Direction the wind blows FROM, degrees. */
  dirDeg: number;
}

export interface AloftProfile {
  /** The hourly valid time this column belongs to. */
  time: string;
  /** Levels at or above the field, sorted ascending by AGL height. */
  levels: AloftLevel[];
}

export interface DayOutlook {
  date: string;
  weatherCode: number;
  tempMaxF: number;
  tempMinF: number;
  precipSumIn: number;
  precipProbMaxPct: number | null;
  windMaxMph: number;
  gustMaxMph: number;
  /** Dominant wind direction (FROM), degrees. */
  windDirDeg: number;
  cloudCoverMeanPct: number | null;
  /** Local-naive sunrise/sunset, when available. */
  sunrise: string | null;
  sunset: string | null;
}

export interface Forecast {
  field: Field;
  current: CurrentConditions;
  hourly: HourPoint[];
  /** One profile per hourly time, parallel to `hourly`. */
  aloftHourly: AloftProfile[];
  daily: DayOutlook[];
  /** Model the figures came from, for the explainer (e.g. "gfs_seamless"). */
  model: string;
}

export interface CloudLayer {
  amount: string; // CLR / FEW / SCT / BKN / OVC / VV
  baseFt: number | null;
}

export interface Sky {
  /** "station" = observed at a nearby reporting station; "model" = Open-Meteo cloud cover. */
  source: "station" | "model";
  // Observed (station) fields:
  station?: { id: string; name: string; distanceMi: number | null; time: string };
  /** Lowest broken/overcast base, feet above the station — null when sky is clear/scattered. */
  ceilingFt?: number | null;
  /** Observed horizontal visibility, statute miles — null when the station omits it. */
  visibilityMi?: number | null;
  layers?: CloudLayer[];
  description?: string;
  // Model fallback:
  cloudCoverPct?: number;
}

export interface WxAlert {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  headline: string;
  description: string;
  onset: string | null;
  ends: string | null;
  senderName: string;
}

export interface BoardData {
  forecast: Forecast;
  sky: Sky;
  /** null = NWS unreachable (we don't claim "none"); [] = checked, no active alerts. */
  alerts: WxAlert[] | null;
  /** Epoch ms the data was fetched (set by the network layer). */
  fetchedAt: number;
}
