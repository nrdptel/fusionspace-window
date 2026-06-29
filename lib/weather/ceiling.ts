/*  Cloud-ceiling clearance: how a planned peak altitude sits against the observed cloud base.
 *
 *  For high-power and model rocketry the ceiling isn't a comfort metric, it's a hard go/no-go
 *  gate. The FAA waiver rules (FAR 101) and the NAR / Tripoli safety codes forbid launching a
 *  rocket into or through cloud, so a flight whose predicted apogee reaches the cloud deck
 *  simply can't go up — regardless of how calm the wind is. The board already reports the
 *  observed ceiling in feet; this turns that bare number into the same kind of toned read every
 *  other figure on the board gets, against a line the flyer sets (their expected apogee).
 *
 *  Pure and tested. The caller owns the "clear sky → unlimited margin" case, since that's the
 *  absence of a ceiling rather than a comparison. */

import type { WindTone } from "./limits";

export interface CeilingRead {
  tone: WindTone;
  /** Short status word for the toned line: "Clear" | "Tight" | "No-go". */
  status: string;
  /** Clear air between the planned peak and the cloud base, in feet (negative = into the deck). */
  marginFt: number;
}

/** The band just below the ceiling we treat as "tight" rather than clear. A predicted apogee
 *  carries real error — motor impulse, liftoff mass and drag coefficient each move it, and ±15%
 *  is an ordinary spread — so a peak that only just sneaks under the deck is not a confident
 *  clearance. Floored at 500 ft so very low flights still get a sensible buffer. */
export function clearanceBufferFt(apogeeFt: number): number {
  return Math.max(500, apogeeFt * 0.15);
}

/** Read an observed cloud ceiling (feet AGL) against a planned apogee (feet AGL).
 *   - peak at or above the ceiling      → "No-go"  (red)    — you'd fly into the deck
 *   - peak within the buffer below it   → "Tight"  (amber)  — margin too slim to trust
 *   - peak comfortably below            → "Clear"  (emerald)
 */
export function ceilingRead(ceilingFt: number, apogeeFt: number): CeilingRead {
  const marginFt = Math.round(ceilingFt - apogeeFt);
  if (marginFt <= 0) return { tone: "red", status: "No-go", marginFt };
  if (marginFt < clearanceBufferFt(apogeeFt)) return { tone: "amber", status: "Tight", marginFt };
  return { tone: "emerald", status: "Clear", marginFt };
}
