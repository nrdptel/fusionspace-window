"use client";

import type { DayOutlook, HourPoint } from "@/lib/weather/model";
import type { ClimatologyNormal } from "@/lib/weather/climatology";
import { compareToNormal } from "@/lib/weather/climatology";
import { SURFACE_LIMIT_MPH } from "@/lib/weather/limits";
import { bestDaylightWindow } from "@/lib/weather/windows";
import {
  degToCompass,
  fmtTemp,
  fmtWind,
  limitLabel,
  resolveUnits,
  TEMP_LABEL,
  WIND_LABEL,
  type UnitPrefs,
} from "@/lib/units";
import { describeWeather } from "@/lib/weather/wmo";
import { clockCompact, clockShort, dayLabel, shortDate } from "@/lib/format";
import { SourceLine } from "./ui";
import WeatherIcon from "./WeatherIcon";
import { SunIcon } from "./icons";

/** A one-line "how does the week compare to normal" read, when the archive lookup landed. */
function SeasonalContext({
  climatology,
  daily,
  units,
}: {
  climatology: ClimatologyNormal;
  daily: DayOutlook[];
  units: UnitPrefs;
}) {
  const u = resolveUnits(units);
  const upcoming = daily.slice(0, 7).map((d) => d.windMaxMph).filter((w) => Number.isFinite(w));
  if (upcoming.length === 0) return null;
  const mean = upcoming.reduce((a, b) => a + b, 0) / upcoming.length;
  const peak = Math.max(...upcoming);
  // Compare like with like: the week's average daily-max against the normal's average.
  const cmp = compareToNormal(mean, climatology);
  const phrase = cmp === "windier" ? "windier than usual" : cmp === "calmer" ? "calmer than usual" : "about typical";
  const tone =
    cmp === "windier"
      ? "text-amber-700 dark:text-amber-400"
      : cmp === "calmer"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-zinc-600 dark:text-zinc-400";
  return (
    <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
      Typical max wind for this week here is{" "}
      <span className="font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
        {fmtWind(climatology.typicalWindMaxMph, u.wind)} {WIND_LABEL[u.wind]}
      </span>{" "}
      ({climatology.years}-yr normal). The next 7 days average{" "}
      <span className="font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
        {fmtWind(mean, u.wind)} {WIND_LABEL[u.wind]}
      </span>{" "}
      (peak {fmtWind(peak, u.wind)}) — <span className={"font-medium " + tone}>{phrase}</span>.
    </div>
  );
}

/** A compact "calmest flyable daylight stretch this day" line for a forecast card. Reuses
 *  the calm-window finder, daylight-only and forward-looking, so the outlook answers *when*
 *  a day is flyable — not just its single max-wind number. */
function DayCalmWindow({
  hourly,
  date,
  limitMph,
  fromIndex,
  unit,
}: {
  hourly: HourPoint[];
  date: string;
  limitMph: number;
  fromIndex: number;
  unit: ReturnType<typeof resolveUnits>["wind"];
}) {
  const w = bestDaylightWindow(hourly, date, limitMph, fromIndex);
  if (!w) {
    return (
      <div
        className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400"
        title={`No daylight hour stays at or under ${fmtWind(limitMph, unit)} ${WIND_LABEL[unit]}`}
      >
        no calm hour
      </div>
    );
  }
  const range =
    w.hours === 1 ? clockCompact(w.startTime) : `${clockCompact(w.startTime)}–${clockCompact(w.endTime)}`;
  return (
    <div
      className="mt-1 flex items-center justify-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400"
      title={`Calmest daylight stretch at or under ${fmtWind(limitMph, unit)} ${WIND_LABEL[unit]} — peak ${fmtWind(w.maxWindMph, unit)} ${WIND_LABEL[unit]}`}
    >
      <SunIcon className="h-3 w-3 text-amber-500" />
      <span className="font-mono tabular-nums">{range}</span>
    </div>
  );
}

export default function Outlook({
  daily,
  hourly,
  units,
  todayIso,
  fromIndex,
  windLine,
  model,
  climatology,
}: {
  daily: DayOutlook[];
  /** Full hourly series, for each day's calmest flyable window. */
  hourly: HourPoint[];
  units: UnitPrefs;
  todayIso: string;
  /** Current-hour index, so today's calm window looks forward. */
  fromIndex: number;
  /** Personal wind line, or null for the 20 mph reference. */
  windLine: number | null;
  model: string;
  /** Seasonal wind normal, when the best-effort archive lookup landed. */
  climatology?: ClimatologyNormal | null;
}) {
  const u = resolveUnits(units);
  const limit = windLine ?? SURFACE_LIMIT_MPH;
  return (
    <>
      {climatology && <SeasonalContext climatology={climatology} daily={daily} units={units} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {daily.slice(0, 7).map((d) => {
          const sky = describeWeather(d.weatherCode, true);
          const windy = d.windMaxMph >= SURFACE_LIMIT_MPH;
          return (
            <div
              key={d.date}
              className="rounded-xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {dayLabel(d.date, todayIso)}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{shortDate(d.date)}</div>
              <div className="my-1.5 flex justify-center" title={sky.label}>
                <WeatherIcon kind={sky.icon} className="h-7 w-7 text-zinc-600 dark:text-zinc-300" />
              </div>
              <div className="font-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                {fmtTemp(d.tempMaxF, u.temp)}°
                <span className="text-zinc-500 dark:text-zinc-400"> / {fmtTemp(d.tempMinF, u.temp)}°</span>
              </div>
              <div
                className={
                  "mt-1 font-mono text-xs tabular-nums " +
                  (windy ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400")
                }
                title="Max sustained wind / gust"
              >
                {fmtWind(d.windMaxMph, u.wind)}
                <span className="text-zinc-500 dark:text-zinc-400">
                  {" "}
                  g{fmtWind(d.gustMaxMph, u.wind)} {WIND_LABEL[u.wind]}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {degToCompass(d.windDirDeg)} ·{" "}
                {d.precipProbMaxPct != null ? `${d.precipProbMaxPct}%` : "—"} precip
              </div>
              <DayCalmWindow
                hourly={hourly}
                date={d.date}
                limitMph={limit}
                fromIndex={fromIndex}
                unit={u.wind}
              />
              {d.sunrise && d.sunset && (
                <div
                  className="mt-1 flex items-center justify-center gap-1 border-t border-zinc-100 pt-1 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                  title="Sunrise and sunset — daylight for setup and recovery"
                >
                  <SunIcon className="h-3 w-3" />
                  {clockShort(d.sunrise)} · {clockShort(d.sunset)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <SourceLine>
        Daily outlook from Open-Meteo ({model}). Wind is the day&apos;s maximum sustained /
        gust; red marks a day whose max crosses the{" "}
        {`${limitLabel(u.wind)} limit`}. The green line is that day&apos;s calmest daylight
        stretch with sustained wind at or under{" "}
        {windLine != null
          ? `your ${fmtWind(windLine, u.wind)} ${WIND_LABEL[u.wind]} line`
          : `the ${limitLabel(u.wind)} reference`}
        {" — "}so a windy day can still show a flyable morning. Temperatures in{" "}
        {TEMP_LABEL[u.temp]}; sunrise/sunset are field-local — useful for planning setup and
        leaving daylight for recovery.
      </SourceLine>
    </>
  );
}
