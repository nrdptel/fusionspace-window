/** URL state. Lat/long is the source of truth for which field the board shows, so a view
 *  is a shareable, reload-proof link — the family's URL-as-state convention. An optional
 *  human label rides along so a shared link reads nicely before the data loads. Units,
 *  the personal wind line, saved fields, and theme are per-device and live in
 *  localStorage instead (see lib/prefs.ts) — they are not part of the shared view. */

export interface UrlState {
  lat: number | null;
  lon: number | null;
  label?: string;
}

function roundCoord(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function validLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}
function validLon(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

export function encodeState(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.lat != null && s.lon != null && validLat(s.lat) && validLon(s.lon)) {
    p.set("lat", String(roundCoord(s.lat)));
    p.set("lon", String(roundCoord(s.lon)));
    if (s.label) p.set("label", s.label);
  }
  return p.toString();
}

export function decodeState(query: string): UrlState {
  const p = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const lat = p.has("lat") ? Number.parseFloat(p.get("lat")!) : NaN;
  const lon = p.has("lon") ? Number.parseFloat(p.get("lon")!) : NaN;
  if (!validLat(lat) || !validLon(lon)) return { lat: null, lon: null };
  const label = p.get("label") || undefined;
  return { lat: roundCoord(lat), lon: roundCoord(lon), label };
}
