/** Convective instability from CAPE (convective available potential energy, J/kg) — the
 *  standard measure of how primed the atmosphere is to build thunderstorms. Afternoon
 *  convection cancels more summer launches than wind does, so it's worth a glance: a clear
 *  morning can turn into towering cumulus and a Red Flag by 3 PM. This classifies CAPE into
 *  the widely-used bands and finds the day's peak, with plain-language context — a real
 *  meteorological figure, surfaced, not a verdict. Pure and tested. */

export type InstabilityBand = "none" | "marginal" | "moderate" | "strong";

export interface Instability {
  band: InstabilityBand;
  label: string;
  tone: "emerald" | "amber" | "red";
  blurb: string;
}

/** Standard CAPE bands (J/kg), as commonly cited by the Storm Prediction Center. */
export function classifyCape(jkg: number): Instability {
  if (!Number.isFinite(jkg) || jkg < 300) {
    return {
      band: "none",
      label: "Stable",
      tone: "emerald",
      blurb: "Little convective energy — thunderstorms are unlikely.",
    };
  }
  if (jkg < 1000) {
    return {
      band: "marginal",
      label: "Marginally unstable",
      tone: "amber",
      blurb: "Some instability — isolated storms are possible if something sets them off.",
    };
  }
  if (jkg < 2500) {
    return {
      band: "moderate",
      label: "Moderately unstable",
      tone: "amber",
      blurb: "Storms are likely where they get a trigger — keep an eye on the sky through the afternoon.",
    };
  }
  return {
    band: "strong",
    label: "Strongly unstable",
    tone: "red",
    blurb: "Strong storms are possible — convection is a real threat today.",
  };
}

export interface CapePeak {
  valueJkg: number;
  index: number;
  time: string;
}

/** The highest CAPE over the next `horizonHours` from `fromIndex`, with when it occurs. */
export function peakCape(
  hourly: { time: string; capeJkg: number }[],
  fromIndex: number,
  horizonHours = 24,
): CapePeak | null {
  const start = Math.max(0, fromIndex);
  const end = Math.min(hourly.length, start + horizonHours);
  let best: CapePeak | null = null;
  for (let i = start; i < end; i++) {
    const v = hourly[i].capeJkg;
    if (!Number.isFinite(v)) continue;
    if (!best || v > best.valueJkg) best = { valueJkg: v, index: i, time: hourly[i].time };
  }
  return best;
}
