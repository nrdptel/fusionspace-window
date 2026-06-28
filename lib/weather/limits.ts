/** The published surface-wind launch limit and how the board tones a wind against it. One
 *  source of truth so the 20 mph line and its green/amber/red bands can't drift apart across
 *  the panels that draw them — the kind of duplication that let an earlier cross-unit bug slip
 *  in. Pure and tested; the Tailwind helper is the one bit of presentation kept alongside, so
 *  every panel colours a wind the same way. */

export const SURFACE_LIMIT_MPH = 20;
/** Where amber starts when no personal line is set — "getting close" below the hard limit. */
export const DEFAULT_CAUTION_MPH = 15;

export type WindTone = "emerald" | "amber" | "red";

/** Tone a sustained wind against the 20 mph line, or a lower personal line when one is set. */
export function windTone(windMph: number, personalLine: number | null = null): WindTone {
  if (windMph >= SURFACE_LIMIT_MPH) return "red";
  if (windMph >= (personalLine ?? DEFAULT_CAUTION_MPH)) return "amber";
  return "emerald";
}

/** Tailwind text-colour classes for a wind tone (light + dark). */
export function windToneTextClass(tone: WindTone): string {
  return tone === "red"
    ? "text-red-700 dark:text-red-400"
    : tone === "amber"
      ? "text-amber-700 dark:text-amber-400"
      : "text-emerald-700 dark:text-emerald-400";
}
