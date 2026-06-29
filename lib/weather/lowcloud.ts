/*  Low-cloud outlook: the forward-looking companion to the observed ceiling.
 *
 *  The observed ceiling (from the nearest METAR) is honest but "now" only — it can't tell a
 *  flyer that low cloud is forecast to build tomorrow afternoon, which is exactly the kind of
 *  thing you'd want to know before driving two hours to a field. Open-Meteo forecasts
 *  low-cloud cover hourly, so this reads that series over the planning window.
 *
 *  Low cloud (stratus / stratocumulus, lifting fog) is the layer that most often forms a
 *  launch-blocking ceiling; high cirrus doesn't. These are cover *bands*, not a forecast
 *  ceiling height — so this is a planning heads-up, deliberately softer than the observed
 *  ceiling, which keeps the actual go/no-go. Pure and tested. */

import type { WindTone } from "./limits";

export type LowCloudBand = "thin" | "broken" | "overcast";

const bandRank = (b: LowCloudBand): number => (b === "thin" ? 0 : b === "broken" ? 1 : 2);

export interface LowCloudRead {
  tone: WindTone;
  band: LowCloudBand;
  label: string; // "Thin" | "Broken" | "Overcast"
}

/** Band a single low-cloud cover figure (%). Thresholds follow the okta convention a METAR
 *  uses for a ceiling: broken (>~halfway, 5–7 oktas) is where a layer starts being called a
 *  ceiling, overcast (8 oktas) is a solid deck. */
export function lowCloudRead(pct: number): LowCloudRead {
  if (pct >= 75) return { tone: "red", band: "overcast", label: "Overcast" };
  if (pct >= 40) return { tone: "amber", band: "broken", label: "Broken" };
  return { tone: "emerald", band: "thin", label: "Thin" };
}

export interface LowCloudHour {
  time: string;
  cloudCoverLowPct: number;
}

export interface LowCloudOutlook {
  nowTime: string;
  nowPct: number;
  now: LowCloudRead;
  peakPct: number;
  peakTime: string;
  peak: LowCloudRead;
  minPct: number;
  minTime: string;
  min: LowCloudRead;
}

/** Summarise a forward window of low-cloud cover. Returns null when the model gives nothing
 *  usable (every hour NaN), so the caller simply omits the read rather than inventing a zero. */
export function lowCloudOutlook(window: LowCloudHour[]): LowCloudOutlook | null {
  const valid = window.filter((h) => Number.isFinite(h.cloudCoverLowPct));
  if (valid.length === 0) return null;
  let peak = valid[0];
  let min = valid[0];
  for (const h of valid) {
    if (h.cloudCoverLowPct > peak.cloudCoverLowPct) peak = h;
    if (h.cloudCoverLowPct < min.cloudCoverLowPct) min = h;
  }
  const nowPct = Math.round(valid[0].cloudCoverLowPct);
  return {
    nowTime: valid[0].time,
    nowPct,
    now: lowCloudRead(nowPct),
    peakPct: Math.round(peak.cloudCoverLowPct),
    peakTime: peak.time,
    peak: lowCloudRead(Math.round(peak.cloudCoverLowPct)),
    minPct: Math.round(min.cloudCoverLowPct),
    minTime: min.time,
    min: lowCloudRead(Math.round(min.cloudCoverLowPct)),
  };
}

/** One-line headline for the outlook. `fmtTime` turns an ISO hour into a short label such as
 *  "Tomorrow 12 PM" — the caller supplies it so this stays free of locale / today context. */
export function lowCloudHeadline(o: LowCloudOutlook, fmtTime: (iso: string) => string): string {
  const worseningLater =
    bandRank(o.peak.band) > bandRank(o.now.band) && o.peakTime !== o.nowTime;
  const clearingLater =
    bandRank(o.min.band) < bandRank(o.now.band) && o.minTime !== o.nowTime;

  if (o.now.band === "thin") {
    if (worseningLater) {
      return `Thin now, building to ${o.peak.label.toLowerCase()} (${o.peakPct}%) by ${fmtTime(o.peakTime)}`;
    }
    return `Thin low cloud across the window (≤${o.peakPct}%)`;
  }
  // now is broken or overcast
  if (clearingLater) {
    return `${o.now.label} now (${o.nowPct}%), thinning to ${o.minPct}% by ${fmtTime(o.minTime)}`;
  }
  return `${o.now.label} low cloud (${o.nowPct}%) holding through the window`;
}
