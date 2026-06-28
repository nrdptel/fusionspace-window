/** Wind shear in the winds-aloft profile. A sharp change in wind between two layers — a big
 *  speed jump, a directional veer, or both — is what tips a rocket off its heading off the
 *  rail and walks the recovery downrange, so flyers read soundings for exactly this. This is
 *  pure geometry over the profile the board already plots: the vector difference of the wind
 *  between adjacent levels, with the strongest layer surfaced. A figure, not a verdict.
 *
 *  Wind is named for the direction it comes FROM, so a level's velocity vector points TOWARD
 *  (from-direction + 180°); the components below encode that. The vector shear magnitude
 *  captures both speed and direction change in one honest number. */

export interface ShearInput {
  aglFt: number;
  windMph: number;
  /** Direction the wind blows FROM, degrees. */
  dirDeg: number;
  label: string;
}

export interface ShearLayer {
  lowerFt: number;
  upperFt: number;
  lowerLabel: string;
  upperLabel: string;
  /** Signed speed change across the layer (upper − lower), mph. */
  deltaSpeedMph: number;
  /** Smallest signed direction change across the layer, degrees (+ = veering clockwise). */
  deltaDirDeg: number;
  /** Magnitude of the vector wind difference across the layer, mph. */
  vectorMph: number;
  /** Vector shear normalised per 1000 ft of altitude, mph/kft. */
  perKftMph: number;
}

/** Wind velocity components (mph), meteorological convention (FROM-direction). */
function components(speed: number, fromDeg: number): { u: number; v: number } {
  const r = (fromDeg * Math.PI) / 180;
  // The wind blows toward (from + 180°); u is eastward, v is northward.
  return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) };
}

/** Smallest signed difference b − a, wrapped to (−180, 180]. */
export function angleDelta(a: number, b: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

/** Shear for each adjacent pair of levels, lowest first. Levels are sorted by altitude. */
export function shearLayers(levels: ShearInput[]): ShearLayer[] {
  const sorted = [...levels]
    .filter((l) => Number.isFinite(l.aglFt) && Number.isFinite(l.windMph) && Number.isFinite(l.dirDeg))
    .sort((a, b) => a.aglFt - b.aglFt);
  const out: ShearLayer[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const lo = sorted[i - 1];
    const hi = sorted[i];
    const a = components(lo.windMph, lo.dirDeg);
    const b = components(hi.windMph, hi.dirDeg);
    const vectorMph = Math.hypot(b.u - a.u, b.v - a.v);
    const dz = Math.max(1, hi.aglFt - lo.aglFt);
    out.push({
      lowerFt: lo.aglFt,
      upperFt: hi.aglFt,
      lowerLabel: lo.label,
      upperLabel: hi.label,
      deltaSpeedMph: hi.windMph - lo.windMph,
      deltaDirDeg: angleDelta(lo.dirDeg, hi.dirDeg),
      vectorMph,
      perKftMph: (vectorMph / dz) * 1000,
    });
  }
  return out;
}

/** The layer with the greatest vector shear, or null when there aren't two levels. */
export function strongestShear(levels: ShearInput[]): ShearLayer | null {
  const layers = shearLayers(levels);
  if (layers.length === 0) return null;
  return layers.reduce((max, l) => (l.vectorMph > max.vectorMph ? l : max));
}
