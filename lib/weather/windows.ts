/** Calm-window finder. The most common question a flyer asks is "when will the wind lay
 *  down so I can fly?" — and the hourly forecast already answers it. This scans forward
 *  from the current hour and returns the upcoming stretches where the surface wind stays
 *  at or below a chosen line (the personal line, or the 20 mph reference), annotated with
 *  how gusty they are and how much of each falls in daylight. It is pure aggregation: it
 *  highlights low-wind daylight stretches against a reference the flyer chose — it does not
 *  decide whether to fly. */

import type { HourPoint } from "./model";

export interface CalmWindow {
  startIndex: number;
  endIndex: number;
  startTime: string;
  endTime: string;
  /** Number of consecutive hours in the run. */
  hours: number;
  /** Peak sustained wind within the window (mph). */
  maxWindMph: number;
  /** Peak gust within the window (mph). */
  gustMaxMph: number;
  meanWindMph: number;
  /** Hours of the run that fall in daylight. */
  daylightHours: number;
  /** Whether any of the run is in daylight. */
  daylight: boolean;
}

export interface CalmWindowOptions {
  /** The line the surface wind must stay at or under (mph). */
  limitMph: number;
  /** Index into `hourly` to start scanning from (usually the current hour). */
  fromIndex: number;
  /** How many hours ahead to consider. */
  horizonHours?: number;
  /** Drop runs shorter than this many hours. */
  minHours?: number;
}

/** Summarise a contiguous run of hours [i, jExclusive) into a CalmWindow. */
function summarizeWindow(hourly: HourPoint[], i: number, jExclusive: number): CalmWindow {
  const run = hourly.slice(i, jExclusive);
  const winds = run.map((h) => h.windMph);
  const gusts = run.map((h) => h.gustMph).filter((g) => Number.isFinite(g));
  const daylightHours = run.filter((h) => h.isDay).length;
  return {
    startIndex: i,
    endIndex: jExclusive - 1,
    startTime: hourly[i].time,
    endTime: hourly[jExclusive - 1].time,
    hours: run.length,
    maxWindMph: Math.max(...winds),
    gustMaxMph: gusts.length ? Math.max(...gusts) : NaN,
    meanWindMph: winds.reduce((a, b) => a + b, 0) / winds.length,
    daylightHours,
    daylight: daylightHours > 0,
  };
}

/** Upcoming stretches where sustained wind stays at or below `limitMph`, in time order. */
export function findCalmWindows(hourly: HourPoint[], opts: CalmWindowOptions): CalmWindow[] {
  const { limitMph, fromIndex } = opts;
  const horizon = opts.horizonHours ?? 48;
  const minHours = opts.minHours ?? 1;
  const start = Math.max(0, fromIndex);
  const end = Math.min(hourly.length, start + horizon);

  const calm = (h: HourPoint) => Number.isFinite(h.windMph) && h.windMph <= limitMph;
  const windows: CalmWindow[] = [];

  let i = start;
  while (i < end) {
    if (!calm(hourly[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < end && calm(hourly[j])) j++;
    if (j - i >= minHours) windows.push(summarizeWindow(hourly, i, j));
    i = j;
  }
  return windows;
}

/** The single best flyable *daylight* window on a given field-local date, or null when no
 *  daylight hour that day stays at or under `limitMph`. "Best" is the longest sub-limit
 *  daylight run, breaking ties by the calmer peak — the honest "when, and for how long,
 *  could I fly that day" glance the multi-day outlook needs, where the daily max wind alone
 *  can't say a windy afternoon still had a calm morning. Pass `fromIndex` (the current hour)
 *  so today's window looks forward rather than counting hours already gone. */
export function bestDaylightWindow(
  hourly: HourPoint[],
  date: string,
  limitMph: number,
  fromIndex = 0,
): CalmWindow | null {
  const ok = (h: HourPoint, idx: number) =>
    idx >= fromIndex &&
    h.time.slice(0, 10) === date &&
    h.isDay &&
    Number.isFinite(h.windMph) &&
    h.windMph <= limitMph;

  let best: CalmWindow | null = null;
  let i = 0;
  while (i < hourly.length) {
    if (!ok(hourly[i], i)) {
      i++;
      continue;
    }
    let j = i;
    while (j < hourly.length && ok(hourly[j], j)) j++;
    const w = summarizeWindow(hourly, i, j);
    if (!best || w.hours > best.hours || (w.hours === best.hours && w.maxWindMph < best.maxWindMph)) {
      best = w;
    }
    i = j;
  }
  return best;
}
