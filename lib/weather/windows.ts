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
    const run = hourly.slice(i, j);
    if (run.length >= minHours) {
      const winds = run.map((h) => h.windMph);
      const gusts = run.map((h) => h.gustMph).filter((g) => Number.isFinite(g));
      const daylightHours = run.filter((h) => h.isDay).length;
      windows.push({
        startIndex: i,
        endIndex: j - 1,
        startTime: hourly[i].time,
        endTime: hourly[j - 1].time,
        hours: run.length,
        maxWindMph: Math.max(...winds),
        gustMaxMph: gusts.length ? Math.max(...gusts) : NaN,
        meanWindMph: winds.reduce((a, b) => a + b, 0) / winds.length,
        daylightHours,
        daylight: daylightHours > 0,
      });
    }
    i = j;
  }
  return windows;
}
