"use client";

import type { HourPoint } from "@/lib/weather/model";
import { clockShort, dayLabel } from "@/lib/format";

/** The shared fly-time scrubber. It appears under each of the three panels that read a single
 *  hour — the hourly timeline, the conditions grid, and the winds-aloft profile — all bound to
 *  the same selection, so you can scrub from wherever you're looking instead of scrolling back
 *  to one control. A compact day/time readout rides alongside so you know the hour at a glance. */
export default function FlyTimeSlider({
  hourly,
  startIndex,
  selectedIndex,
  onSelect,
  todayIso,
  windowHours = 48,
}: {
  hourly: HourPoint[];
  startIndex: number;
  selectedIndex: number;
  onSelect: (absIndex: number) => void;
  todayIso: string;
  windowHours?: number;
}) {
  const count = Math.max(1, Math.min(windowHours, hourly.length - startIndex));
  const selLocal = Math.max(0, Math.min(count - 1, selectedIndex - startIndex));
  const sel = hourly[startIndex + selLocal];

  return (
    <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="shrink-0">Fly-time</span>
      <input
        type="range"
        min={0}
        max={count - 1}
        value={selLocal}
        onChange={(e) => onSelect(startIndex + Number(e.target.value))}
        aria-label="Pick a launch time — sets the conditions snapshot and the winds-aloft profile"
        className="w-full accent-indigo-600"
      />
      {sel && (
        <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
          {dayLabel(sel.time, todayIso)} {clockShort(sel.time)}
        </span>
      )}
    </label>
  );
}
