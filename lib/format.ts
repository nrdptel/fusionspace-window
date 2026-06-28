/** Small, pure time/format helpers. Open-Meteo timestamps are local-naive strings in
 *  the field's own timezone (e.g. "2026-06-27T13:00", no zone suffix), so we read the
 *  clock straight off the string rather than constructing a Date — that keeps the field
 *  time correct regardless of the viewer's own timezone, and keeps server/client first
 *  paint identical. `fetchedAt` is an epoch and is shown on the viewer's clock. */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface NaiveParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

/** Parse a local-naive ISO timestamp (date or date-time) into its parts. */
export function parseNaive(iso: string): NaiveParts | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return {
    year: +m[1],
    month: +m[2],
    day: +m[3],
    hour: m[4] ? +m[4] : 0,
    minute: m[5] ? +m[5] : 0,
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** A 12-hour clock, e.g. "1:05 PM". */
export function clock(iso: string): string {
  const p = parseNaive(iso);
  if (!p) return "—";
  const ampm = p.hour < 12 ? "AM" : "PM";
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${h12}:${pad2(p.minute)} ${ampm}`;
}

/** A compact clock with no minutes when they're zero, e.g. "1 PM" / "1:30 PM". */
export function clockShort(iso: string): string {
  const p = parseNaive(iso);
  if (!p) return "—";
  const ampm = p.hour < 12 ? "AM" : "PM";
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return p.minute === 0 ? `${h12} ${ampm}` : `${h12}:${pad2(p.minute)} ${ampm}`;
}

/** Zeller-free weekday from Y-M-D (uses UTC Date math on the naive date only). */
export function weekdayIndex(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** "Today" / "Tomorrow" / "Sat" for a daily date string, relative to a reference day. */
export function dayLabel(dateIso: string, todayIso: string): string {
  const p = parseNaive(dateIso);
  const t = parseNaive(todayIso);
  if (!p || !t) return "—";
  const a = Date.UTC(p.year, p.month - 1, p.day);
  const b = Date.UTC(t.year, t.month - 1, t.day);
  const diffDays = Math.round((a - b) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return DAYS[weekdayIndex(p.year, p.month, p.day)];
}

/** Short date like "Jun 27". */
export function shortDate(dateIso: string): string {
  const p = parseNaive(dateIso);
  if (!p) return "—";
  return `${MONTHS[p.month - 1]} ${p.day}`;
}

/** A coarse human age for a fetch epoch, e.g. "just now", "5 min ago", "2 h ago". */
export function relativeAge(fetchedAt: number, now: number): string {
  const ms = Math.max(0, now - fetchedAt);
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.floor(hr / 24);
  return `${d} d ago`;
}

const TTL_MS = 10 * 60 * 1000; // 10 min — a reload/units-toggle inside this window reuses cache.

/** Whether cached data is past its freshness window and should be refetched if online. */
export function isStale(fetchedAt: number, now: number, ttlMs: number = TTL_MS): boolean {
  return now - fetchedAt > ttlMs;
}

export { TTL_MS };
