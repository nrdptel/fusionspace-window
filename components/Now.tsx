"use client";

import type { CurrentConditions, Field } from "@/lib/weather/model";
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
import { clock, relativeAge } from "@/lib/format";
import { Card, Pill, SourceLine, Stat } from "./ui";
import WeatherIcon from "./WeatherIcon";

const SURFACE_LIMIT_MPH = 20;

type Tone = "emerald" | "amber" | "red";

function windTone(windMph: number, personalLine: number | null): Tone {
  if (windMph >= SURFACE_LIMIT_MPH) return "red";
  if (windMph >= (personalLine ?? 15)) return "amber";
  return "emerald";
}

function toneText(tone: Tone): string {
  return tone === "red"
    ? "text-red-700 dark:text-red-400"
    : tone === "amber"
      ? "text-amber-700 dark:text-amber-400"
      : "text-emerald-700 dark:text-emerald-400";
}

export interface ObservedWind {
  windMph: number;
  gustMph: number | null;
  dirDeg: number | null;
  stationId: string;
  distanceMi: number | null;
  time: string;
}

/** A small arrow pointing the way the wind blows TOWARD (from-direction + 180°). */
function WindArrow({ fromDeg, className = "" }: { fromDeg: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g transform={`rotate(${fromDeg + 180} 12 12)`}>
        <line x1="12" y1="20" x2="12" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 3 L8 9 L12 7 L16 9 Z" fill="currentColor" />
      </g>
    </svg>
  );
}

export default function Now({
  current,
  field,
  units,
  windLine,
  model,
  observed,
  now,
}: {
  current: CurrentConditions;
  field: Field;
  units: UnitPrefs;
  windLine: number | null;
  model: string;
  /** Nearest-station observed wind, when an observation is available. */
  observed?: ObservedWind | null;
  now: number;
}) {
  const u = resolveUnits(units);
  const sky = describeWeather(current.weatherCode, current.isDay);
  const tone = windTone(current.windMph, windLine);
  const gustOverLimit = current.gustMph >= SURFACE_LIMIT_MPH && current.windMph < SURFACE_LIMIT_MPH;

  const statusText =
    tone === "red"
      ? "Surface wind is over the 20 mph limit"
      : tone === "amber"
        ? "Surface wind is near the limit"
        : "Surface wind is below the limit";

  return (
    <Card>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Wind, against the reference line */}
        <div>
          <div className="flex items-end justify-between gap-4">
            <Stat label="Surface wind" value={fmtWind(current.windMph, u.wind)} unit={WIND_LABEL[u.wind]} tone={tone} />
            <div className="flex flex-col items-center text-zinc-600 dark:text-zinc-300">
              <WindArrow fromDeg={current.dirDeg} className="h-9 w-9" />
              <span className="mt-0.5 font-mono text-xs">
                {degToCompass(current.dirDeg)} {Math.round(current.dirDeg)}°
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Gusting {fmtWind(current.gustMph, u.wind)} {WIND_LABEL[u.wind]} · from{" "}
            {degToCompass(current.dirDeg)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone={tone}>{statusText}</Pill>
            {gustOverLimit && <Pill tone="amber">Gusts over the limit</Pill>}
          </div>

          <div className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              <span className="inline-block h-2 w-4 rounded-sm bg-red-500/60 align-middle" aria-hidden />{" "}
              20 mph — the NFPA/NAR/Tripoli surface-wind limit for launching (a reference, not a verdict).
            </p>
            {windLine != null && (
              <p>
                <span className="inline-block h-2 w-4 rounded-sm bg-amber-500/60 align-middle" aria-hidden />{" "}
                {windLine} mph — your personal line.
              </p>
            )}
          </div>

          {/* Observed cross-check: the nearest real anemometer against the model figure. */}
          {observed && (
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Nearest station
              </div>
              <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span className={"font-mono font-semibold tabular-nums " + toneText(windTone(observed.windMph, windLine))}>
                  {fmtWind(observed.windMph, u.wind)} {WIND_LABEL[u.wind]}
                </span>
                {observed.dirDeg != null && <> from {degToCompass(observed.dirDeg)}</>}
                {observed.gustMph != null && <>, gust {fmtWind(observed.gustMph, u.wind)}</>}
              </div>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Observed at {observed.stationId}
                {observed.distanceMi != null && `, ${Math.round(observed.distanceMi)} mi`}
                {observed.time && `, ${relativeAge(Date.parse(observed.time), now)}`} — a real
                reading to check the model against; it can differ with distance and terrain.
              </p>
            </div>
          )}
        </div>

        {/* Temperature, sky, precip */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-2">
          <Stat label="Temperature" value={fmtTemp(current.tempF, u.temp)} unit={TEMP_LABEL[u.temp]} />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sky</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <WeatherIcon kind={sky.icon} className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />
              <span className="text-sm text-zinc-800 dark:text-zinc-200">{sky.label}</span>
            </div>
          </div>
          <Stat
            label="Feels like"
            value={fmtTemp(current.apparentF, u.temp)}
            unit={TEMP_LABEL[u.temp]}
          />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Cloud / humidity
            </div>
            <div className="mt-0.5 font-mono text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
              {Math.round(current.cloudCoverPct)}% · {Math.round(current.humidityPct)}% RH
            </div>
          </div>
        </div>
      </div>

      <SourceLine>
        Surface from Open-Meteo ({model}) for {field.lat.toFixed(3)}, {field.lon.toFixed(3)} ·
        valid {clock(current.time)} field-local · winds are the direction they blow{" "}
        <em>from</em>.
      </SourceLine>
    </Card>
  );
}
