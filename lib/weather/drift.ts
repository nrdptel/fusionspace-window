/** Mean wind through the column — the single wind vector that, blowing uniformly from the
 *  ground to a chosen ceiling, would carry a recovering rocket the same net distance as the
 *  real winds-aloft profile. Flyers call it the "mean wind" or "ballistic wind"; it's the
 *  honest one-number answer to "which way will it walk on the way down?". It's pure vector
 *  geometry over the profile the board already plots: each level's wind is turned into a
 *  velocity vector and averaged, weighted by the thickness of the altitude band it stands
 *  for (trapezoidal over height), so a thick quiet layer outweighs a thin jutting one.
 *
 *  Because it's a vector average, opposing winds cancel — a profile that veers right around
 *  the compass has a smaller mean than its scalar average, which is exactly the truth a
 *  flyer wants. Wind is named for the direction it comes FROM; the rocket drifts TOWARD the
 *  opposite. A figure with its formula, never a verdict — it points the drift and leaves the
 *  call to you. */

export interface DriftInput {
  aglFt: number;
  windMph: number;
  /** Direction the wind blows FROM, degrees (meteorological convention). */
  dirDeg: number;
}

export interface MeanWind {
  /** Mean wind speed, mph — the magnitude of the thickness-weighted mean velocity vector. */
  speedMph: number;
  /** Direction the mean wind blows FROM, degrees. */
  fromDeg: number;
  /** Direction a recovering rocket tends to drift TOWARD, degrees (fromDeg + 180°). */
  towardDeg: number;
  /** Top of the averaged column, ft AGL. */
  topFt: number;
  /** Number of levels averaged. */
  count: number;
}

/** Downrange drift rate at a given mean wind — feet per minute aloft. Total drift ≈ this ×
 *  the minutes a rocket spends in the air, so the flyer supplies their own hang time: it takes
 *  no rocket parameter and predicts no landing, it just turns the mean wind into the distance
 *  scale recovery actually cares about (mph → ft/min is × 5280/60 = × 88). */
export function driftFtPerMin(meanWindMph: number): number {
  return meanWindMph * (5280 / 60);
}

/** Wind velocity components (mph): the wind blows toward (from + 180°); u east, v north. */
function components(speed: number, fromDeg: number): { u: number; v: number } {
  const r = (fromDeg * Math.PI) / 180;
  return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) };
}

/** Thickness-weighted mean wind through the levels at or below `topFt` (default: all of
 *  them). Returns null when fewer than two finite levels remain to average. */
export function meanWindAloft(levels: DriftInput[], topFt?: number): MeanWind | null {
  const sorted = [...levels]
    .filter((l) => Number.isFinite(l.aglFt) && Number.isFinite(l.windMph) && Number.isFinite(l.dirDeg))
    .sort((a, b) => a.aglFt - b.aglFt);
  const ceiling = topFt ?? (sorted.length ? sorted[sorted.length - 1].aglFt : 0);
  const within = sorted.filter((l) => l.aglFt <= ceiling + 1);
  if (within.length < 2) return null;

  let sumU = 0;
  let sumV = 0;
  let sumW = 0;
  for (let i = 0; i < within.length; i++) {
    // Trapezoidal weight: half the gap to the level below plus half to the one above.
    const below = i > 0 ? (within[i].aglFt - within[i - 1].aglFt) / 2 : 0;
    const above = i < within.length - 1 ? (within[i + 1].aglFt - within[i].aglFt) / 2 : 0;
    const w = below + above;
    const { u, v } = components(within[i].windMph, within[i].dirDeg);
    sumU += u * w;
    sumV += v * w;
    sumW += w;
  }
  if (sumW <= 0) return null;

  const meanU = sumU / sumW;
  const meanV = sumV / sumW;
  const speedMph = Math.hypot(meanU, meanV);
  // Direction the mean vector points TOWARD (0° = north, 90° = east).
  const towardDeg = ((Math.atan2(meanU, meanV) * 180) / Math.PI + 360) % 360;
  const fromDeg = (towardDeg + 180) % 360;

  return {
    speedMph,
    fromDeg,
    towardDeg,
    topFt: within[within.length - 1].aglFt,
    count: within.length,
  };
}
