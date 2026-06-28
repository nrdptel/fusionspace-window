"use client";

import type { UnitPrefs } from "@/lib/units";
import { Segmented } from "./ui";

export default function UnitsControl({
  units,
  onUnits,
  windLine,
  onWindLine,
}: {
  units: UnitPrefs;
  onUnits: (u: UnitPrefs) => void;
  windLine: number | null;
  onWindLine: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
      <div className="flex items-center gap-2">
        <span>Units</span>
        <Segmented
          size="sm"
          ariaLabel="Measurement system"
          value={units.system}
          onChange={(system) => onUnits({ ...units, system })}
          options={[
            { value: "imperial", label: "Imperial" },
            { value: "metric", label: "Metric" },
          ]}
        />
      </div>

      <label className="inline-flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={units.windKnots}
          onChange={(e) => onUnits({ ...units, windKnots: e.target.checked })}
          className="h-3.5 w-3.5 accent-indigo-600"
        />
        Wind in knots
      </label>

      <label className="inline-flex items-center gap-1.5">
        <span>Personal wind line</span>
        <input
          type="number"
          min={1}
          max={20}
          step={1}
          value={windLine ?? ""}
          placeholder="off"
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10);
            onWindLine(Number.isFinite(v) && v > 0 ? Math.min(20, v) : null);
          }}
          aria-label="Personal surface-wind line in mph (optional, up to 20)"
          className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center font-mono tabular-nums outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span>mph</span>
        {windLine != null && (
          <button
            type="button"
            onClick={() => onWindLine(null)}
            className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            clear
          </button>
        )}
      </label>
    </div>
  );
}
