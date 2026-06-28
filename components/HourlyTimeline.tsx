"use client";

import { useMemo } from "react";
import type { HourPoint } from "@/lib/weather/model";
import {
  degToCompass,
  fmtLength,
  fmtTemp,
  fmtWind,
  LENGTH_LABEL,
  limitLabel,
  resolveUnits,
  TEMP_LABEL,
  WIND_LABEL,
  type UnitPrefs,
} from "@/lib/units";
import { clockShort, dayLabel } from "@/lib/format";
import { hourSnapshot } from "@/lib/weather/snapshot";
import { SURFACE_LIMIT_MPH, windTone, windToneTextClass, type WindTone } from "@/lib/weather/limits";
import { SourceLine } from "./ui";

/** A compact labelled figure in the fly-time snapshot. */
function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: WindTone;
}) {
  const toneCls = tone ? windToneTextClass(tone) : "text-zinc-900 dark:text-zinc-100";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</div>
      <div className={"font-mono text-sm tabular-nums " + toneCls}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 dark:text-zinc-400">{sub}</div>}
    </div>
  );
}
const STEP = 19; // px per hour
const TOP = 14;
const BOT = 30;
const H = 172;
const PAD_X = 10;

export default function HourlyTimeline({
  hourly,
  startIndex,
  selectedIndex,
  onSelect,
  units,
  windLine,
  todayIso,
  model,
}: {
  hourly: HourPoint[];
  startIndex: number;
  selectedIndex: number;
  onSelect: (absIndex: number) => void;
  units: UnitPrefs;
  windLine: number | null;
  todayIso: string;
  model: string;
}) {
  const u = resolveUnits(units);
  const window = useMemo(() => hourly.slice(startIndex, startIndex + 48), [hourly, startIndex]);
  const selLocal = Math.max(0, Math.min(window.length - 1, selectedIndex - startIndex));

  const innerH = H - TOP - BOT;
  const width = PAD_X * 2 + window.length * STEP;
  const yMax = Math.max(25, Math.ceil(Math.max(...window.map((h) => h.gustMph)) / 5) * 5);

  const x = (i: number) => PAD_X + i * STEP + STEP / 2;
  const y = (mph: number) => TOP + innerH * (1 - Math.max(0, Math.min(yMax, mph)) / yMax);

  const windPath = window.map((h, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(h.windMph).toFixed(1)}`).join(" ");
  const gustPath = window.map((h, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(h.gustMph).toFixed(1)}`).join(" ");
  const areaPath = `${windPath} L${x(window.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  const sel = window[selLocal];

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width={width}
          height={H}
          role="img"
          aria-label={`Hourly surface wind from ${clockShort(window[0]?.time ?? "")} over ${window.length} hours, in ${WIND_LABEL[u.wind]}. The ${limitLabel(u.wind)} launch limit is drawn as a reference line.`}
          className="text-indigo-600 dark:text-indigo-400"
        >
          {/* grid baseline */}
          <line x1={PAD_X} y1={y(0)} x2={width - PAD_X} y2={y(0)} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />

          {/* 20 mph reference + optional personal line */}
          <line x1={PAD_X} y1={y(SURFACE_LIMIT_MPH)} x2={width - PAD_X} y2={y(SURFACE_LIMIT_MPH)} className="stroke-red-500/70" strokeWidth="1.25" strokeDasharray="5 4" />
          <text x={PAD_X + 2} y={y(SURFACE_LIMIT_MPH) - 3} className="fill-red-500" fontSize="10">{limitLabel(u.wind)} limit</text>
          {windLine != null && windLine < SURFACE_LIMIT_MPH && (
            <>
              <line x1={PAD_X} y1={y(windLine)} x2={width - PAD_X} y2={y(windLine)} className="stroke-amber-500/70" strokeWidth="1.25" strokeDasharray="3 4" />
              <text x={PAD_X + 2} y={y(windLine) - 3} className="fill-amber-500" fontSize="10">{fmtWind(windLine, u.wind)} {WIND_LABEL[u.wind]} (yours)</text>
            </>
          )}

          {/* wind area + lines */}
          <path d={areaPath} className="fill-indigo-500/10" />
          <path d={gustPath} className="fill-none stroke-indigo-300 dark:stroke-indigo-500/60" strokeWidth="1.25" strokeDasharray="2 3" />
          <path d={windPath} className="fill-none stroke-current" strokeWidth="2" strokeLinejoin="round" />

          {/* x ticks every 6 h + day boundaries */}
          {window.map((h, i) => {
            const isDayStart = h.time.endsWith("T00:00");
            if (i % 6 !== 0 && !isDayStart) return null;
            return (
              <g key={i}>
                {isDayStart && i !== 0 && (
                  <line x1={x(i)} y1={TOP} x2={x(i)} y2={TOP + innerH} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />
                )}
                <text x={x(i)} y={H - 16} textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="10">{clockShort(h.time)}</text>
                {(i === 0 || isDayStart) && (
                  <text x={x(i)} y={H - 4} textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="9">{dayLabel(h.time, todayIso)}</text>
                )}
              </g>
            );
          })}

          {/* selected hour marker */}
          <line x1={x(selLocal)} y1={TOP} x2={x(selLocal)} y2={TOP + innerH} className="stroke-indigo-500" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={x(selLocal)} cy={y(sel?.windMph ?? 0)} r="3.5" className="fill-indigo-600 dark:fill-indigo-400" />

          {/* invisible hit targets per hour */}
          {window.map((h, i) => (
            <rect
              key={i}
              x={x(i) - STEP / 2}
              y={TOP}
              width={STEP}
              height={innerH}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSelect(startIndex + i)}
            >
              <title>{`${clockShort(h.time)} — ${Math.round(h.windMph)} mph, gust ${Math.round(h.gustMph)}`}</title>
            </rect>
          ))}
        </svg>
      </div>

      {/* fly-time scrubber */}
      <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="shrink-0">Fly time</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, window.length - 1)}
          value={selLocal}
          onChange={(e) => onSelect(startIndex + Number(e.target.value))}
          aria-label="Pick a launch time — sets the conditions snapshot and the winds-aloft profile"
          className="w-full accent-indigo-600"
        />
      </label>

      {/* fly-time snapshot: conditions at the selected hour */}
      {sel && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            At {dayLabel(sel.time, todayIso)} {clockShort(sel.time)}
          </div>
          {(() => {
            const s = hourSnapshot(sel);
            const da = Number.isFinite(s.densityAltitudeFt)
              ? `${fmtLength(Math.round(s.densityAltitudeFt / 50) * 50, u.length)} ${LENGTH_LABEL[u.length]}`
              : "—";
            return (
              <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
                <Metric
                  label="Wind"
                  value={`${fmtWind(s.windMph, u.wind)} ${WIND_LABEL[u.wind]}`}
                  sub={`g${fmtWind(s.gustMph, u.wind)} · ${degToCompass(s.dirDeg)}`}
                  tone={windTone(s.windMph, windLine)}
                />
                <Metric label="Temp" value={`${fmtTemp(s.tempF, u.temp)}${TEMP_LABEL[u.temp]}`} />
                <Metric label="Density altitude" value={da} />
                <Metric label="Storm" value={s.instability.label} tone={s.instability.tone} />
              </div>
            );
          })()}
        </div>
      )}

      <SourceLine>
        Hourly surface wind from Open-Meteo ({model}); the dashed line is gusts. Drag the
        slider to pick a launch time — it sets the snapshot above and the winds-aloft profile
        below, so you can read the conditions at the hour you plan to fly, not just now.
      </SourceLine>

      {/* Accessible table fallback */}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Show the hourly numbers as a table
        </summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs tabular-nums">
            <caption className="sr-only">Hourly surface wind, gust, and direction</caption>
            <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium">Hour</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Wind ({WIND_LABEL[u.wind]})</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Gust</th>
                <th scope="col" className="px-3 py-1.5 font-medium">From</th>
              </tr>
            </thead>
            <tbody>
              {window.map((h, i) => (
                <tr key={i} className={i === selLocal ? "bg-indigo-500/10" : "odd:bg-zinc-50/60 dark:odd:bg-zinc-900/30"}>
                  <td className="px-3 py-1">{dayLabel(h.time, todayIso).slice(0, 3)} {clockShort(h.time)}</td>
                  <td className={"px-3 py-1 " + (h.windMph >= SURFACE_LIMIT_MPH ? "text-red-600 dark:text-red-400" : "")}>
                    {fmtWind(h.windMph, u.wind)}
                  </td>
                  <td className="px-3 py-1">{fmtWind(h.gustMph, u.wind)}</td>
                  <td className="px-3 py-1">{degToCompass(h.dirDeg)} {Math.round(h.dirDeg)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
