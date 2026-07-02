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

const FPS_PER_MPH = 5280 / 3600; // 1.46667

/** Down-wind drift per foot of altitude lost: the mean wind divided by the descent rate, both
 *  as speeds (wind_fps / descent_fps). The rule of thumb flyers cite — descend at 15 fps in a
 *  10 mph (≈14.7 fps) wind and the rocket walks ~1 ft sideways for every foot it falls. Returns
 *  0 for a non-positive descent rate. */
export function driftPerFoot(meanWindMph: number, descentRateFps: number): number {
  if (!(descentRateFps > 0)) return 0;
  return (meanWindMph * FPS_PER_MPH) / descentRateFps;
}

/** Total down-wind drift (feet) for a rocket falling from `apogeeFt` at `descentRateFps` in this
 *  mean wind — driftPerFoot × the altitude it descends through. A single-rate estimate: a
 *  dual-deploy drogue covers most of the altitude fast and lands the rocket much closer. */
export function driftLandingFt(meanWindMph: number, descentRateFps: number, apogeeFt: number): number {
  return driftPerFoot(meanWindMph, descentRateFps) * Math.max(0, apogeeFt);
}

/** Wind velocity components (mph): the wind blows toward (from + 180°); u east, v north. */
function components(speed: number, fromDeg: number): { u: number; v: number } {
  const r = (fromDeg * Math.PI) / 180;
  return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) };
}

/** Thickness-weighted mean *velocity vector* (mph, drift/toward convention) over the levels
 *  whose height falls in the band [bottomFt, topFt]. Null when the band holds no usable level;
 *  a single in-band level is used as-is. The building block the drift means are averaged from. */
function meanVectorBand(
  levels: DriftInput[],
  bottomFt: number,
  topFt: number,
): { u: number; v: number } | null {
  const band = [...levels]
    .filter((l) => Number.isFinite(l.aglFt) && Number.isFinite(l.windMph) && Number.isFinite(l.dirDeg))
    .filter((l) => l.aglFt >= bottomFt - 1 && l.aglFt <= topFt + 1)
    .sort((a, b) => a.aglFt - b.aglFt);
  if (band.length === 0) return null;
  if (band.length === 1) return components(band[0].windMph, band[0].dirDeg);

  let sumU = 0;
  let sumV = 0;
  let sumW = 0;
  for (let i = 0; i < band.length; i++) {
    const below = i > 0 ? (band[i].aglFt - band[i - 1].aglFt) / 2 : 0;
    const above = i < band.length - 1 ? (band[i + 1].aglFt - band[i].aglFt) / 2 : 0;
    const w = below + above || 1;
    const { u, v } = components(band[i].windMph, band[i].dirDeg);
    sumU += u * w;
    sumV += v * w;
    sumW += w;
  }
  return { u: sumU / sumW, v: sumV / sumW };
}

export interface DualDeployDrift {
  /** Total down-wind landing distance, feet — the vector sum of the two phases (they can pull
   *  in different directions, so it's a vector sum, not a scalar one). */
  distanceFt: number;
  /** Direction the rocket lands relative to the pad, degrees (0 = north, 90 = east). */
  towardDeg: number;
  /** Drift accrued under drogue (apogee → main-deploy), feet. */
  drogueFt: number;
  /** Drift accrued under the main (main-deploy → ground), feet. */
  mainFt: number;
}

/** Dual-deployment landing drift: drogue from apogee down to `mainDeployFt` (fast), then the
 *  main from there to the ground (slow). Each phase drifts with the *actual* mean wind in its
 *  own altitude band (from the winds-aloft profile), so the fast, high drogue phase barely
 *  drifts even in strong upper winds while the slow main phase only spans the last few hundred
 *  feet. Returns the vector-summed landing distance and bearing, plus each phase's contribution.
 *  Null when the inputs are unphysical or the profile can't cover a band. A rough estimate over
 *  the column's mean winds — not a trajectory sim. */
export function dualDeployDrift(
  levels: DriftInput[],
  opts: { apogeeFt: number; mainDeployFt: number; drogueRateFps: number; mainRateFps: number },
): DualDeployDrift | null {
  const { apogeeFt, mainDeployFt, drogueRateFps, mainRateFps } = opts;
  if (
    !(apogeeFt > 0) ||
    !(mainDeployFt > 0) ||
    mainDeployFt >= apogeeFt ||
    !(drogueRateFps > 0) ||
    !(mainRateFps > 0)
  ) {
    return null;
  }

  const drogueMean = meanVectorBand(levels, mainDeployFt, apogeeFt);
  const mainMean = meanVectorBand(levels, 0, mainDeployFt);
  if (!drogueMean || !mainMean) return null;

  const drogueBandFt = apogeeFt - mainDeployFt;
  const mainBandFt = mainDeployFt;

  // Per-phase drift vector = (wind_fps / rate_fps) × band thickness, in the wind's toward dir.
  const dU = (drogueMean.u * FPS_PER_MPH) / drogueRateFps * drogueBandFt + (mainMean.u * FPS_PER_MPH) / mainRateFps * mainBandFt;
  const dV = (drogueMean.v * FPS_PER_MPH) / drogueRateFps * drogueBandFt + (mainMean.v * FPS_PER_MPH) / mainRateFps * mainBandFt;

  const drogueFt = (Math.hypot(drogueMean.u, drogueMean.v) * FPS_PER_MPH * drogueBandFt) / drogueRateFps;
  const mainFt = (Math.hypot(mainMean.u, mainMean.v) * FPS_PER_MPH * mainBandFt) / mainRateFps;

  return {
    distanceFt: Math.hypot(dU, dV),
    towardDeg: ((Math.atan2(dU, dV) * 180) / Math.PI + 360) % 360,
    drogueFt,
    mainFt,
  };
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
