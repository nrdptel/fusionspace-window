"use client";

import { useMemo, useRef } from "react";
import type { HourPoint } from "@/lib/weather/model";
import { hourConditions, type FactorCell } from "@/lib/weather/conditions";
import {
  fmtWind,
  limitLabel,
  resolveUnits,
  WIND_LABEL,
  type UnitPrefs,
} from "@/lib/units";
import { windToneTextClass, type WindTone } from "@/lib/weather/limits";
import { clockShort, dayLabel } from "@/lib/format";
import { SourceLine } from "./ui";
import FlyTimeSlider from "./FlyTimeSlider";
import { FLY_WINDOW_HOURS } from "@/lib/weather/windows";
import { useScrollFollowX, usePinLeftX } from "./useScrollFollow";

const CW = 14; // px per hour
const CH = 16; // row height
const RG = 4; // gap between rows
const TOP = 6;
const BOT = 20; // bottom axis labels
const PAD_R = 8;

const ROWS = [
  { key: "wind", label: "Wind" },
  { key: "gusts", label: "Gusts" },
  { key: "storms", label: "Storms" },
  { key: "precip", label: "Precip" },
] as const;

const FILL: Record<WindTone, string> = {
  emerald: "fill-emerald-400 dark:fill-emerald-500",
  amber: "fill-amber-400 dark:fill-amber-500",
  red: "fill-red-400 dark:fill-red-500",
};

export default function ConditionsTimeline({
  hourly,
  startIndex,
  selectedIndex,
  onSelect,
  units,
  windLine,
  todayIso,
}: {
  hourly: HourPoint[];
  startIndex: number;
  selectedIndex: number;
  onSelect: (absIndex: number) => void;
  units: UnitPrefs;
  windLine: number | null;
  todayIso: string;
}) {
  const u = resolveUnits(units);
  const window = useMemo(() => hourly.slice(startIndex, startIndex + FLY_WINDOW_HOURS), [hourly, startIndex]);
  const conds = useMemo(() => window.map((h) => hourConditions(h, windLine)), [window, windLine]);
  const selLocal = Math.max(0, Math.min(window.length - 1, selectedIndex - startIndex));

  const rowsH = ROWS.length * CH + (ROWS.length - 1) * RG;
  const H = TOP + rowsH + BOT;
  // No gutter inside the SVG: the row labels live in their own fixed column beside the scroll area
  // (below), so cells start at x=0 and nothing ever hides behind a frozen label.
  const width = window.length * CW + PAD_R;
  const x = (i: number) => i * CW;
  const rowY = (r: number) => TOP + r * (CH + RG);

  const cellOf = (c: ReturnType<typeof hourConditions>, key: (typeof ROWS)[number]["key"]): FactorCell =>
    c[key];

  // Follow the fly-time selection so the selected column stays in view when the grid overflows.
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollFollowX(scrollRef, x(selLocal), x(selLocal) + CW);
  // Freeze the row-label column at the left edge so you can always tell which row is which.
  const labelsRef = useRef<SVGGElement>(null);
  usePinLeftX(scrollRef, labelsRef);

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
        The next 3 days, each factor against its own line. Scan down a column for one hour, or
        across a row for when a factor clears. Tap a column to set the fly-time.
      </p>

      {/* A fixed row-label column beside the horizontally-scrolling grid — the labels stay put and
          never cover data (a true frozen column, not an overlay). */}
      <div className="flex items-start">
        <div className="relative shrink-0 pr-1.5" style={{ height: H, width: 54 }} aria-hidden="true">
          {ROWS.map((row, r) => (
            <span
              key={row.key}
              className="absolute left-0 text-[10px] text-zinc-600 dark:text-zinc-300"
              style={{ top: rowY(r) + CH / 2, transform: "translateY(-50%)" }}
            >
              {row.label}
            </span>
          ))}
        </div>

        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width={width}
          height={H}
          role="img"
          aria-label={`Conditions for the next ${window.length} hours, four rows — wind, gusts, storm potential, and chance of rain — each colored green, amber, or red against its own reference. Full values are in the table below.`}
        >
          {/* cells */}
          {conds.map((c, i) =>
            ROWS.map((row, r) => {
              const cell = cellOf(c, row.key);
              return (
                <rect
                  key={`${row.key}${i}`}
                  x={x(i)}
                  y={rowY(r)}
                  width={CW - 1}
                  height={CH}
                  rx="1.5"
                  className={FILL[cell.tone]}
                />
              );
            }),
          )}

          {/* day-boundary separators + 6 h time labels */}
          {window.map((h, i) => {
            const isDayStart = h.time.endsWith("T00:00");
            if (i % 6 !== 0 && !isDayStart) return null;
            // A midnight boundary always shows "12 AM" + the day name; suppress a plain 6 h tick's
            // clock when it crowds one (within 2 h), so labels like "11 PM" and "12 AM" don't collide.
            const hr = Number(h.time.slice(11, 13));
            const showClock = i === 0 || isDayStart || !(hr >= 22 || hr <= 2);
            return (
              <g key={`t${i}`}>
                {isDayStart && i !== 0 && (
                  <line
                    x1={x(i) - 0.5}
                    y1={TOP - 2}
                    x2={x(i) - 0.5}
                    y2={TOP + rowsH + 2}
                    className="stroke-zinc-300 dark:stroke-zinc-600"
                    strokeWidth="1"
                  />
                )}
                {showClock && (
                  <text
                    x={x(i) + CW / 2}
                    y={H - 8}
                    textAnchor="middle"
                    className="fill-zinc-500 dark:fill-zinc-400"
                    fontSize="9"
                  >
                    {clockShort(h.time)}
                  </text>
                )}
                {(i === 0 || isDayStart) && (
                  <text
                    x={x(i) + CW / 2}
                    y={H - 0}
                    textAnchor="middle"
                    className="fill-zinc-500 dark:fill-zinc-400"
                    fontSize="8"
                  >
                    {dayLabel(h.time, todayIso)}
                  </text>
                )}
              </g>
            );
          })}

          {/* selected-hour outline across all rows */}
          <rect
            x={x(selLocal) - 1}
            y={TOP - 2}
            width={CW + 1}
            height={rowsH + 4}
            rx="2"
            fill="none"
            className="stroke-indigo-600 dark:stroke-indigo-400"
            strokeWidth="1.5"
          />

          {/* per-column hit targets */}
          {window.map((h, i) => {
            const c = conds[i];
            const title = `${dayLabel(h.time, todayIso)} ${clockShort(h.time)} — wind ${fmtWind(h.windMph, u.wind)} ${WIND_LABEL[u.wind]}, ${c.gusts.label.toLowerCase()}, storms ${c.storms.label.toLowerCase()}, precip ${c.precip.label}`;
            return (
              <rect
                key={`hit${i}`}
                x={x(i)}
                y={TOP}
                width={CW}
                height={rowsH}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelect(startIndex + i)}
              >
                <title>{title}</title>
              </rect>
            );
          })}

          {/* Frozen row-label column — pinned to the left edge as the grid scrolls (usePinLeftX),
              on an opaque backing so cells never show through behind it. Left-anchored so it can't
              clip; the gutter keeps it off the cells at rest. */}
          <g ref={labelsRef}>
            <rect x={0} y={0} width={GUTTER - 4} height={TOP + rowsH + 3} className="fill-white dark:fill-zinc-950" />
            {ROWS.map((row, r) => (
              <text
                key={row.key}
                x={2}
                y={rowY(r) + CH / 2 + 3}
                textAnchor="start"
                className="fill-zinc-600 dark:fill-zinc-300"
                fontSize="10"
              >
                {row.label}
              </text>
            ))}
          </g>
        </svg>
        </div>
      </div>

      {/* fly-time scrubber — synced with the other panels, and it scrolls the grid to the hour */}
      <FlyTimeSlider
        hourly={hourly}
        startIndex={startIndex}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        todayIso={todayIso}
        windowHours={window.length}
      />

      {/* color key */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-500" /> clear
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-amber-400 dark:bg-amber-500" /> caution
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-red-400 dark:bg-red-500" /> watch
        </span>
      </div>

      <SourceLine>
        Each row is colored against its own reference — wind and gusts against the{" "}
        {limitLabel(u.wind)} line{windLine != null ? " (and your personal line)" : ""}, storm
        potential by CAPE band, and precip by the chance of rain. There&apos;s deliberately no
        single blended score: four honest reads, stacked, so the call stays yours.
      </SourceLine>

      {/* Accessible table fallback */}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Show the conditions grid as a table
        </summary>
        <div
          tabIndex={0}
          aria-label="Hourly conditions table"
          className="mt-2 max-h-72 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800"
        >
          <table className="w-full text-left text-xs tabular-nums">
            <caption className="sr-only">
              Wind, gusts, storm potential, and chance of rain by hour for the next 3 days
            </caption>
            <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium">Hour</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Wind</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Gusts</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Storms</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Precip</th>
              </tr>
            </thead>
            <tbody>
              {window.map((h, i) => {
                const c = conds[i];
                return (
                  <tr key={i} className={i === selLocal ? "bg-indigo-500/5 font-medium" : "odd:bg-zinc-50/60 dark:odd:bg-zinc-900/30"}>
                    <td className="px-3 py-1">{dayLabel(h.time, todayIso).slice(0, 3)} {clockShort(h.time)}</td>
                    <td className={"px-3 py-1 " + windToneTextClass(c.wind.tone)}>{fmtWind(h.windMph, u.wind)}</td>
                    <td className={"px-3 py-1 " + windToneTextClass(c.gusts.tone)}>{c.gusts.label}</td>
                    <td className={"px-3 py-1 " + windToneTextClass(c.storms.tone)}>{c.storms.label}</td>
                    <td className={"px-3 py-1 " + windToneTextClass(c.precip.tone)}>{c.precip.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
