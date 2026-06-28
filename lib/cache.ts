/** Last-known board cache, per field, in localStorage. Window's value is live data, so
 *  this is what keeps an offline or failed-fetch visit from showing an error in place of
 *  data: the most recent successful board is stored per field and shown with an
 *  "as of <time>" staleness flag (the flag, not the cache, is what tells the truth about
 *  freshness — see lib/format.ts `isStale`). The key derivation and the snapshot shape are
 *  pure and tested; the localStorage IO is a thin wrapper that no-ops in private mode. */

import type { BoardData } from "./weather/model";

const PREFIX = "window.cache.";

export interface CachedBoard {
  data: BoardData;
}

/** A stable per-field key, rounded so a reload of the same field hits but distinct
 *  fields don't collide (~110 m at 3 decimals). */
export function cacheKey(lat: number, lon: number): string {
  const r = (n: number) => (Math.round(n * 1e3) / 1e3).toFixed(3);
  return `${PREFIX}${r(lat)},${r(lon)}`;
}

export function readCache(lat: number, lon: number): BoardData | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lon));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBoard;
    if (!parsed?.data?.forecast?.field) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache(lat: number, lon: number, data: BoardData): void {
  try {
    localStorage.setItem(cacheKey(lat, lon), JSON.stringify({ data } satisfies CachedBoard));
  } catch {
    /* private mode or quota — last-known simply won't persist */
  }
}
