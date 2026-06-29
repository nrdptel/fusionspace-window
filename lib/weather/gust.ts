/** Wind steadiness — how much the gusts overshoot the sustained wind. The 20 mph launch
 *  line is about *sustained* wind, but gusty, variable air is its own hazard: a gust at the
 *  wrong moment pushes a rocket off heading right at the rail, and rod whip and erratic
 *  weathercocking get worse as the spread grows. This reads the sustained-vs-gust pair the
 *  board already shows and bands it — steady / gusty / very gusty — by both the gust factor
 *  (peak ÷ sustained) and the absolute spread, so a big ratio over a light breeze isn't
 *  over-flagged and a wide spread over a strong wind isn't missed. Pure and tested; a figure
 *  with its reasoning, never a verdict. */

import type { WindTone } from "./limits";

export type GustBand = "steady" | "gusty" | "very-gusty";

export interface Gustiness {
  band: GustBand;
  /** Display label: "Steady" | "Gusty" | "Very gusty". */
  label: string;
  tone: WindTone;
  /** Gust ÷ sustained — 1 when there's no gust above the sustained wind. */
  factor: number;
  /** Gust − sustained, in the unit of the inputs (mph). */
  spreadMph: number;
  /** Why it matters, lower-case so a caller can place it mid-sentence. */
  blurb: string;
}

// Light, variable air gusting over a small base isn't a turbulence hazard off the rod.
const LIGHT_GUST_MPH = 12;
const MIN_SPREAD_MPH = 5;
// Band by EITHER a high ratio OR a wide absolute spread, whichever trips first.
const GUSTY_FACTOR = 1.4;
const GUSTY_SPREAD_MPH = 8;
const VERY_FACTOR = 1.8;
const VERY_SPREAD_MPH = 14;

const STEADY_BLURB = "little gust over the sustained wind";

/** Band the gustiness of a sustained/gust wind pair (mph). */
export function gustiness(windMph: number, gustMph: number): Gustiness {
  const steady = (factor: number, spreadMph: number): Gustiness => ({
    band: "steady",
    label: "Steady",
    tone: "emerald",
    factor,
    spreadMph,
    blurb: STEADY_BLURB,
  });

  if (!Number.isFinite(windMph) || !Number.isFinite(gustMph) || gustMph <= windMph) {
    return steady(1, 0);
  }
  const spreadMph = gustMph - windMph;
  const factor = windMph > 0 ? gustMph / windMph : Infinity;

  if (gustMph < LIGHT_GUST_MPH || spreadMph < MIN_SPREAD_MPH) {
    return steady(Number.isFinite(factor) ? factor : 1, spreadMph);
  }
  if (factor >= VERY_FACTOR || spreadMph >= VERY_SPREAD_MPH) {
    return {
      band: "very-gusty",
      label: "Very gusty",
      tone: "red",
      factor,
      spreadMph,
      blurb: "strong, variable wind is hard on stability right off the rod",
    };
  }
  if (factor >= GUSTY_FACTOR || spreadMph >= GUSTY_SPREAD_MPH) {
    return {
      band: "gusty",
      label: "Gusty",
      tone: "amber",
      factor,
      spreadMph,
      blurb: "the wind varies enough to push a rocket off heading at the rail",
    };
  }
  return steady(factor, spreadMph);
}
