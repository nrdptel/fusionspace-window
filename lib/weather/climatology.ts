/** Climatological context — "is this week unusually windy, or normal for the season?". The
 *  forecast says what's coming; this says whether what's coming is typical. It answers the
 *  planning question a flyer actually weighs days out: wait for a better window, or accept
 *  that this is about as good as the season gets here.
 *
 *  It's a best-effort enhancement, the same posture as NWS: a few years of the field's own
 *  daily history from Open-Meteo's archive, averaged over a window of dates around the same
 *  week of the year, gives a "typical max wind" to set the forecast against. All pure and
 *  tested over the archive response; the fetch lives in net.ts and the board renders fine
 *  without it. A descriptive comparison, never a verdict. */

export interface RawArchive {
  daily?: {
    time?: string[];
    wind_speed_10m_max?: (number | null)[];
    wind_gusts_10m_max?: (number | null)[];
  };
  daily_units?: Record<string, string>;
}

export interface ClimatologyNormal {
  /** Distinct calendar years contributing to the average. */
  years: number;
  /** Number of days averaged (within the date window across those years). */
  sampleDays: number;
  /** Half-width of the date window, days. */
  windowDays: number;
  /** Typical daily-max sustained wind for this week of the year, mph. */
  typicalWindMaxMph: number;
  /** Typical daily-max gust, mph — null when the archive omitted gusts. */
  typicalGustMaxMph: number | null;
}

export type NormalComparison = "windier" | "typical" | "calmer";

// Cumulative days before each month (non-leap); good enough for a ±-week window.
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** Day-of-year index (1–365) from an ISO date string, parsed without the Date object. */
function dayIndex(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return MONTH_START[month - 1] + day;
}

/** Circular distance between two day-of-year indices, in days (0–182). */
function circularDayDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 365 - d);
}

/** Average the archive's daily-max wind over the dates within `windowDays` of the reference
 *  date's week of the year. Null when there isn't enough usable history. */
export function summarizeClimatology(
  raw: RawArchive,
  referenceISO: string,
  windowDays = 7,
): ClimatologyNormal | null {
  const refDoy = dayIndex(referenceISO);
  if (refDoy == null) return null;

  const dates = raw.daily?.time ?? [];
  const winds = raw.daily?.wind_speed_10m_max ?? [];
  const gusts = raw.daily?.wind_gusts_10m_max ?? [];

  let windSum = 0;
  let windCount = 0;
  let gustSum = 0;
  let gustCount = 0;
  const years = new Set<string>();

  for (let i = 0; i < dates.length; i++) {
    const doy = dayIndex(dates[i]);
    if (doy == null || circularDayDistance(doy, refDoy) > windowDays) continue;
    const w = winds[i];
    if (typeof w !== "number" || !Number.isFinite(w)) continue;
    windSum += w;
    windCount += 1;
    years.add(dates[i].slice(0, 4));
    const g = gusts[i];
    if (typeof g === "number" && Number.isFinite(g)) {
      gustSum += g;
      gustCount += 1;
    }
  }

  // Need a meaningful sample — a couple of years' worth of the window.
  if (windCount < 5) return null;

  return {
    years: years.size,
    sampleDays: windCount,
    windowDays,
    typicalWindMaxMph: windSum / windCount,
    typicalGustMaxMph: gustCount > 0 ? gustSum / gustCount : null,
  };
}

/** Describe how an upcoming peak wind sits against the seasonal normal. The band is
 *  proportional with a small floor, so a few mph over a calm normal doesn't over-read. */
export function compareToNormal(upcomingMaxMph: number, normal: ClimatologyNormal): NormalComparison {
  const typical = normal.typicalWindMaxMph;
  const margin = Math.max(3, typical * 0.2);
  if (upcomingMaxMph >= typical + margin) return "windier";
  if (upcomingMaxMph <= typical - margin) return "calmer";
  return "typical";
}
