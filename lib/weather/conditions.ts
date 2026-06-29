/** The per-hour, per-factor status behind the conditions timeline. The board's panels each
 *  answer one question (wind, gusts, storms, rain); this lines them up hour by hour so a flyer
 *  can scan for a window where ALL of them are clear at once, without reading four charts. Each
 *  factor is coloured against its OWN reference — there is deliberately no single blended
 *  go/no-go, just four honest reads stacked in time. Pure and tested; the component only paints
 *  what this returns. */

import type { HourPoint } from "./model";
import { windTone, type WindTone } from "./limits";
import { gustiness } from "./gust";
import { classifyCape } from "./instability";

export interface FactorCell {
  tone: WindTone;
  /** A short, unit-agnostic status word for the tooltip and the table fallback. */
  label: string;
}

export interface HourConditions {
  time: string;
  wind: FactorCell;
  gusts: FactorCell;
  storms: FactorCell;
  precip: FactorCell;
}

/** Compact CAPE-band words for the grid (the storm panel spells them out in full). */
const CAPE_SHORT: Record<string, string> = {
  none: "Stable",
  marginal: "Marginal",
  moderate: "Moderate",
  strong: "Strong",
};

// Chance-of-rain bands (%). A dry hour is green; a coin-flip is amber; likely is red.
const PRECIP_AMBER_PCT = 20;
const PRECIP_RED_PCT = 55;
// Fallback when the model gives no probability: tone the modelled amount (inches/hour).
const PRECIP_RED_IN = 0.05;

function precipCell(h: HourPoint): FactorCell {
  const p = h.precipProbPct;
  if (p != null && Number.isFinite(p)) {
    const tone: WindTone = p >= PRECIP_RED_PCT ? "red" : p >= PRECIP_AMBER_PCT ? "amber" : "emerald";
    return { tone, label: `${Math.round(p)}%` };
  }
  const amt = h.precipIn;
  if (!Number.isFinite(amt) || amt <= 0) return { tone: "emerald", label: "dry" };
  return { tone: amt >= PRECIP_RED_IN ? "red" : "amber", label: "wet" };
}

/** The four factor reads for one hour, each toned against its own reference. */
export function hourConditions(h: HourPoint, windLine: number | null): HourConditions {
  const g = gustiness(h.windMph, h.gustMph);
  const cape = classifyCape(h.capeJkg);
  return {
    time: h.time,
    wind: {
      tone: windTone(h.windMph, windLine),
      label: Number.isFinite(h.windMph) ? `${Math.round(h.windMph)} mph` : "—",
    },
    gusts: { tone: g.tone, label: g.label },
    storms: { tone: cape.tone, label: CAPE_SHORT[cape.band] ?? cape.label },
    precip: precipCell(h),
  };
}
