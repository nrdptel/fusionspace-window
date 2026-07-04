"use client";

import { useMemo, useRef } from "react";
import type { HourPoint } from "@/lib/weather/model";
import { clockShort, dayLabel } from "@/lib/format";
import { lowCloudRead } from "@/lib/weather/lowcloud";
import { windToneTextClass, type WindTone } from "@/lib/weather/limits";
import { FLY_WINDOW_HOURS } from "@/lib/weather/windows";
import FlyTimeSlider from "./FlyTimeSlider";
import { useScrollFollowX, usePinLeftX } from "./useScrollFollow";

const STEP = 16; // px per hour
const BARW = 11; // bar width (leaves a gutter between hours)
const TOP = 14;
const BOT = 30; // two rows of x labels (clock + day)
const H = 150;
const PAD_X = 10;

// Band thresholds (%) — the same okta-style cuts lowCloudRead() bands on, drawn as reference
// lines so the chart is read "against its own line" like the wind timeline's launch limit.
const BROKEN = 40;
const OVERCAST = 75;

const FILL: Record<WindTone, string> = {
  emerald: "fill-emerald-400 dark:fill-emerald-500",
  amber: "fill-amber-400 dark:fill-amber-500",
  red: "fill-red-400 dark:fill-red-500",
};

/** The modeled low-cloud outlook as a full, scrollable timeline — the forward-looking companion
 *  to the observed ceiling. It's built in the same visual family as the wind and conditions
 *  timelines (a scrolling chart bound to the shared fly-time, with its own scrubber), but stays
 *  deliberately distinct: it's modeled *cover*, not a forecast ceiling, so it carries no hard red
 *  limit — just the broken/overcast band lines and a soft snapshot read. The observed ceiling
 *  above keeps the actual go/no-go. */
export default function LowCloudTimeline({
  hourly,
  startIndex,
  selectedIndex,
  onSelect,
  todayIso,
}: {
  hourly: HourPoint[];
  startIndex: number;
  selectedIndex: number;
  onSelect: (absIndex: number) => void;
  todayIso: string;
}) {
  const window = useMemo(
    () => hourly.slice(startIndex, startIndex + FLY_WINDOW_HOURS),
    [hourly, startIndex],
  );
  const pcts = useMemo(
    () => window.map((h) => (Number.isFinite(h.cloudCoverLowPct) ? Math.round(h.cloudCoverLowPct) : null)),
    [window],
  );
  const selLocal = Math.max(0, Math.min(window.length - 1, selectedIndex - startIndex));

  const innerH = H - TOP - BOT;
  const width = PAD_X * 2 + window.length * STEP;
  const x = (i: number) => PAD_X + i * STEP + STEP / 2;
  const y = (pct: number) => TOP + innerH * (1 - Math.max(0, Math.min(100, pct)) / 100);

  // Follow the fly-time selection so the selected hour stays in view when the 72 h chart overflows.
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollFollowX(scrollRef, x(selLocal) - STEP / 2, x(selLocal) + STEP / 2);
  // Freeze the band labels ("broken", "overcast") at the left edge as the chart scrolls.
  const labelsRef = useRef<SVGGElement>(null);
  usePinLeftX(scrollRef, labelsRef);

  const selHour = window[selLocal];
  const selPct = pcts[selLocal];
  const selRead = selPct != null ? lowCloudRead(selPct) : null;

  // If a midnight boundary lands within ~3 h of the start, its centered "12 AM / Tomorrow" label
  // would crowd the first column's; drop the first column's labels and let the boundary stand.
  const boundaryNearStart = window.slice(1, 4).some((h) => h.time.endsWith("T00:00"));

  return (
    <div>
      {/* tabIndex/aria-label so the horizontally-scrolling chart is keyboard-operable (this panel
          sits in a narrower column than the wind/conditions timelines, so it overflows sooner). */}
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Low-cloud outlook chart — scroll horizontally for later hours"
        className="mt-2 overflow-x-auto"
      >
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width={width}
          height={H}
          role="img"
          aria-label={`Modeled low-cloud cover, next ${window.length} hours, as a percentage. Reference lines mark broken (${BROKEN}%) and overcast (${OVERCAST}%). Full values are in the table below.`}
        >
          {/* baseline */}
          <line x1={PAD_X} y1={y(0)} x2={width - PAD_X} y2={y(0)} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />

          {/* band reference lines — full-width; labels pinned to the left edge (below). No hard red
              "limit": this is a heads-up, not the go/no-go, so the lines are just band boundaries. */}
          <line x1={PAD_X} y1={y(BROKEN)} x2={width - PAD_X} y2={y(BROKEN)} className="stroke-amber-500/70" strokeWidth="1.25" strokeDasharray="4 4" />
          <line x1={PAD_X} y1={y(OVERCAST)} x2={width - PAD_X} y2={y(OVERCAST)} className="stroke-red-500/70" strokeWidth="1.25" strokeDasharray="4 4" />

          {/* bars, colored by band */}
          {pcts.map((p, i) => {
            if (p == null) return null;
            const top = y(p);
            return (
              <rect
                key={i}
                x={x(i) - BARW / 2}
                y={top}
                width={BARW}
                height={y(0) - top}
                rx="1.5"
                className={FILL[lowCloudRead(p).tone]}
              />
            );
          })}

          {/* x ticks every 6 h + day boundaries */}
          {window.map((h, i) => {
            const isDayStart = h.time.endsWith("T00:00");
            if (i % 6 !== 0 && !isDayStart) return null;
            const hr = Number(h.time.slice(11, 13));
            const isFirst = i === 0;
            const showFirst = isFirst && !boundaryNearStart;
            const showClock = isFirst ? showFirst : isDayStart || !(hr >= 22 || hr <= 2);
            const showDay = isFirst ? showFirst : isDayStart;
            return (
              <g key={`t${i}`}>
                {isDayStart && i !== 0 && (
                  <line x1={x(i)} y1={TOP} x2={x(i)} y2={TOP + innerH} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />
                )}
                {showClock && <text x={x(i)} y={H - 16} textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="10">{clockShort(h.time)}</text>}
                {showDay && <text x={x(i)} y={H - 4} textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="9">{dayLabel(h.time, todayIso)}</text>}
              </g>
            );
          })}

          {/* selected hour marker */}
          <line x1={x(selLocal)} y1={TOP} x2={x(selLocal)} y2={TOP + innerH} className="stroke-indigo-500" strokeWidth="1" strokeDasharray="3 3" />
          {selPct != null && <circle cx={x(selLocal)} cy={y(selPct)} r="3.5" className="fill-indigo-600 dark:fill-indigo-400" />}

          {/* per-hour hit targets */}
          {window.map((h, i) => (
            <rect
              key={`hit${i}`}
              x={x(i) - STEP / 2}
              y={TOP}
              width={STEP}
              height={innerH}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSelect(startIndex + i)}
            >
              <title>{`${dayLabel(h.time, todayIso)} ${clockShort(h.time)} — ${pcts[i] ?? "—"}% low cloud`}</title>
            </rect>
          ))}

          {/* Band labels, pinned to the left edge on a soft backing so they stay legible on scroll. */}
          <g ref={labelsRef}>
            <rect x={PAD_X} y={y(OVERCAST) - 12} width={"overcast".length * 5.4 + 4} height={12} rx="2" className="fill-white/85 dark:fill-zinc-950/85" />
            <text x={PAD_X + 2} y={y(OVERCAST) - 3} className="fill-red-500" fontSize="10">overcast</text>
            <rect x={PAD_X} y={y(BROKEN) - 12} width={"broken".length * 5.4 + 4} height={12} rx="2" className="fill-white/85 dark:fill-zinc-950/85" />
            <text x={PAD_X + 2} y={y(BROKEN) - 3} className="fill-amber-600 dark:fill-amber-500" fontSize="10">broken</text>
          </g>
        </svg>
      </div>

      {/* fly-time scrubber — shared with the wind and conditions panels */}
      <FlyTimeSlider
        hourly={hourly}
        startIndex={startIndex}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        todayIso={todayIso}
        windowHours={window.length}
      />

      {/* snapshot at the selected hour */}
      {selHour && (
        <p className="mt-2 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            At your fly-time · {dayLabel(selHour.time, todayIso)} {clockShort(selHour.time)} —{" "}
          </span>
          {selPct != null && selRead ? (
            <span className={"font-medium " + windToneTextClass(selRead.tone)}>
              {selRead.label.toLowerCase()} low cloud ({selPct}%)
            </span>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">no low-cloud model data</span>
          )}
        </p>
      )}

      {/* Accessible table fallback */}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Show the low-cloud outlook as a table
        </summary>
        <div
          tabIndex={0}
          aria-label="Hourly low-cloud table"
          className="mt-2 max-h-72 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800"
        >
          <table className="w-full text-left text-xs tabular-nums">
            <caption className="sr-only">Modeled low-cloud cover by hour for the next 3 days</caption>
            <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium">Hour</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Low cloud</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Band</th>
              </tr>
            </thead>
            <tbody>
              {window.map((h, i) => {
                const p = pcts[i];
                const read = p != null ? lowCloudRead(p) : null;
                return (
                  <tr key={i} className={i === selLocal ? "bg-indigo-500/5 font-medium" : "odd:bg-zinc-50/60 dark:odd:bg-zinc-900/30"}>
                    <td className="px-3 py-1">{dayLabel(h.time, todayIso).slice(0, 3)} {clockShort(h.time)}</td>
                    <td className="px-3 py-1">{p != null ? `${p}%` : "—"}</td>
                    <td className={"px-3 py-1 " + (read ? windToneTextClass(read.tone) : "")}>{read ? read.label : "—"}</td>
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
