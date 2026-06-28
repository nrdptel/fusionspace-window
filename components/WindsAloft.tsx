"use client";

import { useState } from "react";
import type { AloftProfile, Field } from "@/lib/weather/model";
import {
  degToCompass,
  fmtLength,
  fmtWind,
  LENGTH_LABEL,
  resolveUnits,
  WIND_LABEL,
  windFromMph,
  type UnitPrefs,
} from "@/lib/units";
import { clockShort } from "@/lib/format";
import { strongestShear } from "@/lib/weather/shear";
import { meanWindAloft } from "@/lib/weather/drift";
import { Segmented, SourceLine } from "./ui";

const W = 580;
const H = 380;
const ML = 52;
const MR = 96;
const MT = 16;
const MB = 30;
const SURFACE_AGL_FT = 33; // 10 m anemometer height

type TopKey = "10000" | "20000" | "30000" | "all";
const TOP_OPTIONS = [
  { value: "10000" as TopKey, label: "10k" },
  { value: "20000" as TopKey, label: "20k" },
  { value: "30000" as TopKey, label: "30k" },
  { value: "all" as TopKey, label: "All" },
];

interface PlotLevel {
  aglFt: number;
  windMph: number;
  dirDeg: number;
  label: string;
}

export default function WindsAloft({
  profile,
  surfaceWindMph,
  surfaceDirDeg,
  field,
  units,
  model,
}: {
  profile: AloftProfile;
  surfaceWindMph: number;
  surfaceDirDeg: number;
  field: Field;
  units: UnitPrefs;
  model: string;
}) {
  const u = resolveUnits(units);
  const [top, setTop] = useState<TopKey>("20000");

  // Surface wind sits at the bottom of the column, then the pressure levels above it.
  const all: PlotLevel[] = [
    { aglFt: SURFACE_AGL_FT, windMph: surfaceWindMph, dirDeg: surfaceDirDeg, label: "Surface" },
    ...profile.levels.map((l) => ({
      aglFt: l.aglFt,
      windMph: l.windMph,
      dirDeg: l.dirDeg,
      label: `${l.pressureHpa} hPa`,
    })),
  ].filter((l) => Number.isFinite(l.windMph) && Number.isFinite(l.aglFt));

  const dataTop = Math.max(...all.map((l) => l.aglFt), 1000);
  const topFt = top === "all" ? Math.ceil(dataTop / 1000) * 1000 : Number(top);
  const shown = all.filter((l) => l.aglFt <= topFt + 1);

  const innerW = W - ML - MR;
  const innerH = H - MT - MB;
  const sU = (mph: number) => windFromMph(mph, u.wind);
  const maxSpeedU = Math.max(...shown.map((l) => sU(l.windMph)), 1);
  const xMaxU = Math.max(20, Math.ceil(maxSpeedU / 10) * 10);

  const x = (mph: number) => ML + (innerW * sU(mph)) / xMaxU;
  const y = (agl: number) => MT + innerH * (1 - Math.min(topFt, Math.max(0, agl)) / topFt);

  const curve = shown.map((l, i) => `${i === 0 ? "M" : "L"}${x(l.windMph).toFixed(1)},${y(l.aglFt).toFixed(1)}`).join(" ");

  // y-axis altitude ticks every 5000 ft (label converted to the active unit).
  const altTicks: number[] = [];
  for (let a = 0; a <= topFt + 1; a += 5000) altTicks.push(a);
  // x-axis speed ticks every 10 in the active unit.
  const speedTicks: number[] = [];
  for (let s = 0; s <= xMaxU; s += 10) speedTicks.push(s);

  const empty = profile.levels.length === 0;
  const shear = strongestShear(shown);
  const mean = meanWindAloft(shown, topFt);

  // 0°C level, drawn as a reference line when it falls inside the shown column.
  const freezingAglFt = profile.freezingLevelAglFt;
  const showFreezing = Number.isFinite(freezingAglFt) && freezingAglFt > 0 && freezingAglFt <= topFt;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Valid {clockShort(profile.time)} field-local
        </p>
        <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Top</span>
          <Segmented size="sm" ariaLabel="Top altitude of the profile" value={top} onChange={setTop} options={TOP_OPTIONS} />
        </label>
      </div>

      {empty ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          No winds-aloft data is available for this hour over this field.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height={H}
            role="img"
            aria-label={`Winds-aloft profile valid ${clockShort(profile.time)}: wind speed in ${WIND_LABEL[u.wind]} versus altitude above ground, from the surface to ${fmtLength(topFt, u.length)} ${LENGTH_LABEL[u.length]}. Full numbers are in the table below.`}
            className="text-indigo-600 dark:text-indigo-400"
          >
            {/* altitude gridlines + labels */}
            {altTicks.map((a) => (
              <g key={`a${a}`}>
                <line x1={ML} y1={y(a)} x2={ML + innerW} y2={y(a)} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />
                <text x={ML - 6} y={y(a) + 3} textAnchor="end" className="fill-zinc-500 dark:fill-zinc-400" fontSize="10">
                  {fmtLength(a, u.length)}
                </text>
              </g>
            ))}
            {/* speed ticks */}
            {speedTicks.map((s) => (
              <g key={`s${s}`}>
                <line x1={ML + (innerW * s) / xMaxU} y1={MT} x2={ML + (innerW * s) / xMaxU} y2={MT + innerH} className="stroke-zinc-100 dark:stroke-zinc-800/60" strokeWidth="1" />
                <text x={ML + (innerW * s) / xMaxU} y={H - 16} textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="10">{s}</text>
              </g>
            ))}
            <text x={ML + innerW / 2} y={H - 3} textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="10">
              wind speed ({WIND_LABEL[u.wind]})
            </text>
            <text x={12} y={MT + 4} className="fill-zinc-500 dark:fill-zinc-400" fontSize="10">altitude AGL ({LENGTH_LABEL[u.length]})</text>

            {/* 0°C freezing level — where the air turns sub-freezing on the way up */}
            {showFreezing && (
              <g>
                <line x1={ML} y1={y(freezingAglFt)} x2={ML + innerW} y2={y(freezingAglFt)} className="stroke-sky-500/70" strokeWidth="1.25" strokeDasharray="4 4" />
                <text x={ML + 4} y={y(freezingAglFt) - 3} className="fill-sky-600 dark:fill-sky-400" fontSize="10">0°C</text>
                <text x={ML + innerW} y={y(freezingAglFt) - 3} textAnchor="end" className="fill-sky-600 dark:fill-sky-400" fontSize="10">
                  {fmtLength(freezingAglFt, u.length)} {LENGTH_LABEL[u.length]} AGL
                </text>
              </g>
            )}

            {/* the speed curve */}
            <path d={curve} className="fill-none stroke-current" strokeWidth="2" strokeLinejoin="round" />

            {/* per-level dots, direction barbs, and labels */}
            {shown.map((l, i) => {
              const px = x(l.windMph);
              const py = y(l.aglFt);
              const bx = ML + innerW + 26; // direction-barb column
              return (
                <g key={i}>
                  <circle cx={px} cy={py} r="3" className="fill-indigo-600 dark:fill-indigo-400" />
                  <line x1={px} y1={py} x2={bx - 8} y2={py} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" strokeDasharray="2 2" />
                  {/* barb points the way the wind blows TOWARD */}
                  <g transform={`translate(${bx} ${py})`} className="text-zinc-500 dark:text-zinc-400">
                    <g transform={`rotate(${l.dirDeg + 180})`}>
                      <line x1="0" y1="7" x2="0" y2="-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M0 -9 L-3 -4 L0 -5.5 L3 -4 Z" fill="currentColor" />
                    </g>
                  </g>
                  <text x={bx + 12} y={py + 3} className="fill-zinc-600 dark:fill-zinc-300" fontSize="10">
                    {fmtWind(l.windMph, u.wind)} {degToCompass(l.dirDeg)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {!empty && mean && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            Drift
          </span>
          <span className="text-zinc-700 dark:text-zinc-300">
            Mean wind to {fmtLength(mean.topFt, u.length)} {LENGTH_LABEL[u.length]}{" "}
            <span className="font-mono tabular-nums">
              {fmtWind(mean.speedMph, u.wind)} {WIND_LABEL[u.wind]}
            </span>{" "}
            from {degToCompass(mean.fromDeg)} — recovery tends to walk{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{degToCompass(mean.towardDeg)}</span>.
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            The column&apos;s average wind, the way drift leans — not a landing prediction.
          </span>
        </div>
      )}

      {!empty && shear && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Shear
          </span>
          <span className="text-zinc-700 dark:text-zinc-300">
            Strongest layer{" "}
            <span className="font-mono tabular-nums">
              {fmtLength(shear.lowerFt, u.length)} → {fmtLength(shear.upperFt, u.length)} {LENGTH_LABEL[u.length]}
            </span>{" "}
            — {shear.deltaSpeedMph >= 0 ? "+" : "−"}
            {fmtWind(Math.abs(shear.deltaSpeedMph), u.wind)} {WIND_LABEL[u.wind]}
            {Math.abs(shear.deltaDirDeg) >= 5 && (
              <>
                {" "}and {shear.deltaDirDeg >= 0 ? "veers" : "backs"}{" "}
                <span className="font-mono tabular-nums">{Math.abs(Math.round(shear.deltaDirDeg))}°</span>
              </>
            )}
            .
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            Sharp layers can tip a rocket off its heading and walk the recovery — your call.
          </span>
        </div>
      )}

      <SourceLine>
        Winds aloft from Open-Meteo ({model}) pressure levels, each mapped to height above
        the field (ground elevation {fmtLength(field.elevationFt, u.length)}{" "}
        {LENGTH_LABEL[u.length]}) via geopotential height. Barbs point the way the wind
        blows — winds are named for the direction they come <em>from</em>.
        {showFreezing && " The blue line is the 0°C level for this hour."}
      </SourceLine>

      {/* Accessible table fallback */}
      {!empty && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Show the winds-aloft numbers as a table
          </summary>
          <div className="mt-2 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs tabular-nums">
              <caption className="sr-only">Wind speed and direction by altitude above ground</caption>
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-3 py-1.5 font-medium">Altitude AGL ({LENGTH_LABEL[u.length]})</th>
                  <th scope="col" className="px-3 py-1.5 font-medium">Level</th>
                  <th scope="col" className="px-3 py-1.5 font-medium">Wind ({WIND_LABEL[u.wind]})</th>
                  <th scope="col" className="px-3 py-1.5 font-medium">From</th>
                </tr>
              </thead>
              <tbody>
                {[...all].reverse().map((l, i) => (
                  <tr key={i} className="odd:bg-zinc-50/60 dark:odd:bg-zinc-900/30">
                    <td className="px-3 py-1">{fmtLength(l.aglFt, u.length)}</td>
                    <td className="px-3 py-1">{l.label}</td>
                    <td className="px-3 py-1">{fmtWind(l.windMph, u.wind)}</td>
                    <td className="px-3 py-1">{degToCompass(l.dirDeg)} {Math.round(l.dirDeg)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
