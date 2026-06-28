"use client";

import type { DayOutlook } from "@/lib/weather/model";
import type { ClimatologyNormal } from "@/lib/weather/climatology";
import { compareToNormal } from "@/lib/weather/climatology";
import {
  degToCompass,
  fmtTemp,
  fmtWind,
  resolveUnits,
  TEMP_LABEL,
  WIND_LABEL,
  type UnitPrefs,
} from "@/lib/units";
import { describeWeather } from "@/lib/weather/wmo";
import { clockShort, dayLabel, shortDate } from "@/lib/format";
import { SourceLine } from "./ui";
import WeatherIcon from "./WeatherIcon";
import { SunIcon } from "./icons";

const SURFACE_LIMIT_MPH = 20;

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
  const peak = Math.max(...upcoming);
  const cmp = compareToNormal(peak, climatology);
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
      ({climatology.years}-yr normal). The next 7 days peak at{" "}
      <span className="font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
        {fmtWind(peak, u.wind)} {WIND_LABEL[u.wind]}
      </span>{" "}
      — <span className={"font-medium " + tone}>{phrase}</span>.
    </div>
  );
}

export default function Outlook({
  daily,
  units,
  todayIso,
  model,
  climatology,
}: {
  daily: DayOutlook[];
  units: UnitPrefs;
  todayIso: string;
  model: string;
  /** Seasonal wind normal, when the best-effort archive lookup landed. */
  climatology?: ClimatologyNormal | null;
}) {
  const u = resolveUnits(units);
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
        gust; red marks a day whose max crosses the 20 mph limit. Temperatures in{" "}
        {TEMP_LABEL[u.temp]}; sunrise/sunset are field-local — useful for planning setup and
        leaving daylight for recovery.
      </SourceLine>
    </>
  );
}
