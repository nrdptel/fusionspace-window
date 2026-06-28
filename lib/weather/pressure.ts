/** Barometric tendency — which way the pressure is moving and how fast. A falling barometer
 *  is the oldest honest warning that weather is on the way in: an approaching low or front
 *  brings the wind up and the ceiling down, while a rising one usually means high pressure
 *  building and conditions settling. It's the natural companion to storm potential — the air
 *  destabilising while the pressure drops is a sharper heads-up than either alone.
 *
 *  This is plain arithmetic over the hourly station pressure the board already fetches: the
 *  change from a few hours back to the chosen hour, with a small dead-band so ordinary diurnal
 *  wobble reads as steady. A figure with its rate, never a verdict. */

import type { HourPoint } from "./model";

export type PressureTrend = "rising" | "falling" | "steady";

export interface PressureTendency {
  /** Signed change over the span, hPa (chosen hour minus the earlier hour). */
  changeHpa: number;
  /** Rate of change, hPa per hour. */
  perHourHpa: number;
  /** Hours actually spanned (less than asked for near the start of the series). */
  spanHours: number;
  trend: PressureTrend;
}

/** A change of at least this much over the span counts as a real rise/fall, not diurnal noise. */
const STEADY_BAND_HPA = 1;

/** Pressure tendency at `hourIndex`, looking back `spanHours`. Null when there isn't enough
 *  finite history to measure it. */
export function pressureTendency(
  hourly: HourPoint[],
  hourIndex: number,
  spanHours = 3,
): PressureTendency | null {
  if (hourIndex <= 0 || hourIndex >= hourly.length) return null;
  const startIndex = Math.max(0, hourIndex - spanHours);
  const span = hourIndex - startIndex;
  if (span <= 0) return null;

  const now = hourly[hourIndex]?.surfacePressureHpa;
  const past = hourly[startIndex]?.surfacePressureHpa;
  if (now == null || past == null || !Number.isFinite(now) || !Number.isFinite(past)) return null;

  const changeHpa = now - past;
  const trend: PressureTrend =
    changeHpa >= STEADY_BAND_HPA ? "rising" : changeHpa <= -STEADY_BAND_HPA ? "falling" : "steady";

  return { changeHpa, perHourHpa: changeHpa / span, spanHours: span, trend };
}
