/*  Dew point and the temperature–dew-point spread — the standard moisture read a weather board
 *  carries, and the one item on the hobby-rocketry "what to measure" checklists Window didn't
 *  yet show. It matters on its own terms: a tight spread means the air is near saturation, so
 *  fog and condensation on altimeters and recovery gear are likely (and fog cuts the visibility
 *  and tracking the rest of the board already cares about); a wide spread is dry air.
 *
 *  Pure. Dew point is derived from temperature + relative humidity by the Magnus–Tetens
 *  approximation — accurate to a few tenths of a degree across normal launch conditions — so it
 *  needs no extra data beyond the temp and RH the board already fetches. */

import type { WindTone } from "./limits";

const A = 17.625;
const B = 243.04; // °C

/** Dew point (°F) from temperature (°F) and relative humidity (%). NaN if either is missing. */
export function dewPointF(tempF: number, humidityPct: number): number {
  if (!Number.isFinite(tempF) || !Number.isFinite(humidityPct)) return NaN;
  const rh = Math.max(1, Math.min(100, humidityPct));
  const tC = ((tempF - 32) * 5) / 9;
  const gamma = Math.log(rh / 100) + (A * tC) / (B + tC);
  const dC = (B * gamma) / (A - gamma);
  return (dC * 9) / 5 + 32;
}

export interface SpreadRead {
  /** Temperature minus dew point, °F (floored at 0). */
  spreadF: number;
  label: string;
  tone: WindTone;
}

/** Read the temperature–dew-point spread (°F). Fog and saturation set in as the spread closes
 *  toward zero; the bands follow the rough aviation rule that a spread within ~4°F is
 *  fog / low-stratus territory. Returns null when temp or dew point is missing. */
export function spreadRead(tempF: number, dewF: number): SpreadRead | null {
  if (!Number.isFinite(tempF) || !Number.isFinite(dewF)) return null;
  const spreadF = Math.max(0, tempF - dewF);
  if (spreadF <= 4) return { spreadF, label: "near saturation — fog and condensation likely", tone: "amber" };
  if (spreadF <= 9) return { spreadF, label: "humid — condensation possible on cold gear", tone: "emerald" };
  return { spreadF, label: "dry air", tone: "emerald" };
}
