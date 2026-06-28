"use client";

import { useMemo } from "react";
import type { HourPoint } from "@/lib/weather/model";
import { findCalmWindows, type CalmWindow } from "@/lib/weather/windows";
import { fmtWind, limitLabel, resolveUnits, WIND_LABEL, type UnitPrefs } from "@/lib/units";
import { SURFACE_LIMIT_MPH } from "@/lib/weather/limits";
import { clockShort, dayLabel } from "@/lib/format";
import { MoonIcon, SunIcon } from "./icons";

const MAX_SHOWN = 4;

export default function CalmWindows({
  hourly,
  fromIndex,
  selectedIndex,
  onSelect,
  units,
  windLine,
  todayIso,
}: {
  hourly: HourPoint[];
  fromIndex: number;
  selectedIndex: number;
  onSelect: (absIndex: number) => void;
  units: UnitPrefs;
  windLine: number | null;
  todayIso: string;
}) {
  const u = resolveUnits(units);
  const limit = windLine ?? SURFACE_LIMIT_MPH;

  const windows = useMemo(
    () =>
      findCalmWindows(hourly, {
        limitMph: limit,
        fromIndex,
        horizonHours: Math.min(48, hourly.length - fromIndex),
        minHours: 1,
      }),
    [hourly, limit, fromIndex],
  );

  const lineLabel = `under ${windLine != null ? `${fmtWind(windLine, u.wind)} ${WIND_LABEL[u.wind]} (your line)` : limitLabel(u.wind)}`;

  if (windows.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Calm windows</span> — no
        stretch stays {lineLabel} in the next two days. Keep an eye on it, or check back as the
        forecast updates.
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Calm windows</span> —
        upcoming stretches with sustained wind {lineLabel}. Tap one to read its winds aloft.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {windows.slice(0, MAX_SHOWN).map((w) => (
          <WindowChip
            key={w.startIndex}
            w={w}
            unit={u.wind}
            todayIso={todayIso}
            selected={selectedIndex >= w.startIndex && selectedIndex <= w.endIndex}
            onClick={() => onSelect(w.startIndex)}
          />
        ))}
      </div>
    </div>
  );
}

function WindowChip({
  w,
  unit,
  todayIso,
  selected,
  onClick,
}: {
  w: CalmWindow;
  unit: ReturnType<typeof resolveUnits>["wind"];
  todayIso: string;
  selected: boolean;
  onClick: () => void;
}) {
  const sameDay = w.startTime.slice(0, 10) === w.endTime.slice(0, 10);
  const range = sameDay
    ? `${dayLabel(w.startTime, todayIso)} ${clockShort(w.startTime)}–${clockShort(w.endTime)}`
    : `${dayLabel(w.startTime, todayIso)} ${clockShort(w.startTime)} – ${dayLabel(w.endTime, todayIso)} ${clockShort(w.endTime)}`;
  const gusty = Number.isFinite(w.gustMaxMph) && w.gustMaxMph >= 20;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "rounded-lg border px-3 py-1.5 text-left text-xs transition " +
        (selected
          ? "border-indigo-400 bg-indigo-500/10 dark:border-indigo-500"
          : "border-zinc-200 bg-white hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-500/50")
      }
    >
      <span className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
        {w.daylight ? (
          <SunIcon className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <MoonIcon className="h-3.5 w-3.5 text-zinc-500" />
        )}
        {range}
      </span>
      <span className="mt-0.5 block font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
        ≤{fmtWind(w.maxWindMph, unit)} {WIND_LABEL[unit]}
        {gusty && (
          <span className="text-amber-700 dark:text-amber-400"> · gusts {fmtWind(w.gustMaxMph, unit)}</span>
        )}
        {!w.daylight && <span className="text-zinc-500 dark:text-zinc-400"> · after dark</span>}
      </span>
    </button>
  );
}
