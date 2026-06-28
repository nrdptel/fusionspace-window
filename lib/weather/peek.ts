/** A "wind peek" — just the current surface wind for a field, for the saved-fields glance in
 *  the picker. A club running more than one launch site wants to see which is flyable right
 *  now without opening each one, so each saved field carries its current wind against the
 *  20 mph line. It's a deliberately tiny slice of the forecast (current wind only), fetched
 *  best-effort and cached; the parser is pure and tested, the fetch lives in net.ts. */

export interface WindPeek {
  windMph: number;
  /** Gust, mph — NaN when the model omits it. */
  gustMph: number;
  /** Direction the wind blows FROM, degrees. */
  dirDeg: number;
}

interface RawPeek {
  current?: Record<string, number | string | null>;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Parse a minimal current-wind Open-Meteo response. Null when the wind isn't present. */
export function parseWindPeek(raw: unknown): WindPeek | null {
  const c = (raw as RawPeek)?.current;
  if (!c) return null;
  const windMph = num(c.wind_speed_10m);
  const dirDeg = num(c.wind_direction_10m);
  if (windMph == null || dirDeg == null) return null;
  return { windMph, gustMph: num(c.wind_gusts_10m) ?? NaN, dirDeg };
}
