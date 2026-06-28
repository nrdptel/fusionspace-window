/** A plain-text field briefing — the one-paragraph summary a flyer pastes into the club
 *  chat before a launch. It's just the data the board already shows, formatted as text with
 *  its source and the not-authoritative disclaimer baked in, so a shared briefing carries
 *  the same honesty as the page. Pure and tested; the share URL is passed in so this stays
 *  free of any browser globals. No verdict — it states conditions against the 20 mph
 *  reference and stops there. */

import type { BoardData } from "./model";
import { densityAltitudeFt } from "./density";
import { meanWindAloft } from "./drift";
import { findCalmWindows } from "./windows";
import {
  degToCompass,
  fmtLength,
  fmtTemp,
  fmtWind,
  LENGTH_LABEL,
  resolveUnits,
  TEMP_LABEL,
  WIND_LABEL,
  type UnitPrefs,
} from "../units";
import { clock, clockShort, dayLabel } from "../format";

const SURFACE_LIMIT_MPH = 20;
// Representative AGL heights to sample the winds-aloft profile for the briefing.
const ALOFT_TARGETS_FT = [3000, 6000, 12000, 20000];

export interface BriefingOptions {
  units: UnitPrefs;
  /** Hourly index whose aloft profile to summarise (usually the current hour). */
  hourIndex: number;
  /** Personal wind line (mph), or null. */
  windLine: number | null;
  /** Absolute, shareable URL for this field. */
  shareUrl: string;
}

function surfacePhrase(windMph: number, windLine: number | null): string {
  if (windMph >= SURFACE_LIMIT_MPH) return "over the 20 mph limit";
  if (windMph >= (windLine ?? 15)) return "near the 20 mph limit";
  return "below the 20 mph limit";
}

/** Pick the profile level nearest each target AGL height (deduped, in order). */
function sampleAloft(
  levels: { aglFt: number; windMph: number; dirDeg: number }[],
): { aglFt: number; windMph: number; dirDeg: number }[] {
  const picked: typeof levels = [];
  const usedIdx = new Set<number>();
  for (const target of ALOFT_TARGETS_FT) {
    let best = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < levels.length; i++) {
      const diff = Math.abs(levels[i].aglFt - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    if (best >= 0 && !usedIdx.has(best)) {
      usedIdx.add(best);
      picked.push(levels[best]);
    }
  }
  return picked.sort((a, b) => a.aglFt - b.aglFt);
}

export function buildBriefing(board: BoardData, opts: BriefingOptions): string {
  const { units, hourIndex, windLine, shareUrl } = opts;
  const u = resolveUnits(units);
  const { forecast, sky, alerts } = board;
  const c = forecast.current;
  const f = forecast.field;
  const lines: string[] = [];

  const place = f.label ?? `${f.lat.toFixed(3)}, ${f.lon.toFixed(3)}`;
  lines.push(`Window — ${place}`);
  lines.push(`${f.lat.toFixed(3)}, ${f.lon.toFixed(3)} · valid ${clock(c.time)} field-local`);
  lines.push("");

  lines.push(
    `Surface wind: ${fmtWind(c.windMph, u.wind)} ${WIND_LABEL[u.wind]} from ${degToCompass(c.dirDeg)} (${Math.round(c.dirDeg)}°), ` +
      `gusting ${fmtWind(c.gustMph, u.wind)} — ${surfacePhrase(c.windMph, windLine)}`,
  );

  // Sky / ceiling
  if (sky.source === "station") {
    const ceil =
      sky.ceilingFt != null
        ? `ceiling ${fmtLength(sky.ceilingFt, u.length)} ${LENGTH_LABEL[u.length]}`
        : "no ceiling";
    const station = sky.station ? ` (${sky.station.id}, observed)` : " (observed)";
    lines.push(`Sky: ${sky.description}, ${ceil}${station}`);
  } else {
    lines.push(`Sky: ${Math.round(sky.cloudCoverPct ?? 0)}% cloud (modeled)`);
  }

  // Temp + density altitude
  const da = densityAltitudeFt({ tempF: c.tempF, rhPct: c.humidityPct, pressureHpa: c.surfacePressureHpa });
  const daStr = Number.isFinite(da)
    ? ` · density altitude ~${(Math.round((da * (u.length === "m" ? 0.3048 : 1)) / 50) * 50).toLocaleString("en-US")} ${LENGTH_LABEL[u.length]}`
    : "";
  lines.push(
    `Temp: ${fmtTemp(c.tempF, u.temp)}${TEMP_LABEL[u.temp]} (feels ${fmtTemp(c.apparentF, u.temp)}${TEMP_LABEL[u.temp]})${daStr}`,
  );

  // Winds aloft
  const profile = forecast.aloftHourly[hourIndex] ?? forecast.aloftHourly[0];
  if (profile && profile.levels.length > 0) {
    const sampled = sampleAloft(profile.levels);
    const parts = sampled.map(
      (l) => `${fmtLength(l.aglFt, u.length)} ${fmtWind(l.windMph, u.wind)} ${degToCompass(l.dirDeg)}`,
    );
    lines.push(`Winds aloft (AGL ${LENGTH_LABEL[u.length]}/${WIND_LABEL[u.wind]}): ${parts.join(" · ")}`);

    const mean = meanWindAloft(profile.levels);
    if (mean) {
      lines.push(
        `Mean wind to ${fmtLength(mean.topFt, u.length)} ${LENGTH_LABEL[u.length]}: ` +
          `${fmtWind(mean.speedMph, u.wind)} ${WIND_LABEL[u.wind]} from ${degToCompass(mean.fromDeg)} — drift toward ${degToCompass(mean.towardDeg)}`,
      );
    }
  }

  // Alerts
  if (alerts && alerts.length > 0) {
    lines.push(`Alerts: ${alerts.map((a) => `${a.event} (${a.severity})`).join("; ")}`);
  }

  // Next calm window
  const windows = findCalmWindows(forecast.hourly, {
    limitMph: windLine ?? SURFACE_LIMIT_MPH,
    fromIndex: hourIndex,
    horizonHours: Math.min(48, forecast.hourly.length - hourIndex),
  });
  if (windows.length > 0) {
    const w = windows[0];
    const range = `${dayLabel(w.startTime, c.time)} ${clockShort(w.startTime)}–${clockShort(w.endTime)}`;
    lines.push(
      `Next calm window (≤${windLine ?? SURFACE_LIMIT_MPH} mph): ${range}${w.daylight ? ", daylight" : ", after dark"}`,
    );
  }

  // Short outlook
  const outlook = forecast.daily
    .slice(0, 3)
    .map((d) => `${dayLabel(d.date, c.time)} ${fmtTemp(d.tempMaxF, u.temp)}/${fmtTemp(d.tempMinF, u.temp)}`)
    .join(" · ");
  if (outlook) lines.push(`Outlook (${TEMP_LABEL[u.temp]}): ${outlook}`);

  lines.push("");
  lines.push(shareUrl);
  lines.push("Best-effort, not authoritative — confirm conditions yourself before flying.");

  return lines.join("\n");
}
