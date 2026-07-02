"use client";

import type { UnitPrefs } from "@/lib/units";
import { Segmented } from "./ui";

export default function UnitsControl({
  units,
  onUnits,
  windLine,
  onWindLine,
  apogee,
  onApogee,
  descentRate,
  onDescentRate,
}: {
  units: UnitPrefs;
  onUnits: (u: UnitPrefs) => void;
  windLine: number | null;
  onWindLine: (v: number | null) => void;
  apogee: number | null;
  onApogee: (v: number | null) => void;
  descentRate: number | null;
  onDescentRate: (v: number | null) => void;
}) {
  return (
    <div className="space-y-3 text-xs text-zinc-500 dark:text-zinc-400">
      {/* Display settings. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
      </div>

      {/* Optional personal inputs — spelled out so it's clear they're optional and what each
          one turns on (the effects show up in other panels). */}
      <div>
        <p className="mb-1.5 max-w-2xl">
          Optional — set a lower wind limit, and add your apogee and descent rate to unlock the
          cloud-ceiling go/no-go and a recovery landing-drift estimate.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label
        className="inline-flex items-center gap-1.5"
        title="Optional lower wind limit (up to 20 mph) — tones the current wind, the hourly chart's line, and the calm windows against your number instead of the default."
      >
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

      <label
        className="inline-flex items-center gap-1.5"
        title="Optional predicted peak (ft AGL) — reads the observed cloud ceiling against it as a Clear / Tight / No-go gate, and feeds the landing-drift estimate."
      >
        <span>Expected apogee</span>
        <input
          type="number"
          min={1}
          max={100000}
          step={100}
          value={apogee ?? ""}
          placeholder="off"
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10);
            onApogee(Number.isFinite(v) && v > 0 ? Math.min(100000, v) : null);
          }}
          aria-label="Expected apogee in feet AGL (optional) — reads the cloud ceiling as a go/no-go gate"
          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center font-mono tabular-nums outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span>ft AGL</span>
        {apogee != null && (
          <button
            type="button"
            onClick={() => onApogee(null)}
            className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            clear
          </button>
        )}
      </label>

      <label
        className="inline-flex items-center gap-1.5"
        title="Optional recovery descent rate (ft/s) — with your apogee, turns the winds-aloft mean wind into a landing-drift distance."
      >
        <span>Descent rate</span>
        <input
          type="number"
          min={1}
          max={200}
          step={1}
          value={descentRate ?? ""}
          placeholder="off"
          onChange={(e) => {
            const v = Number.parseFloat(e.target.value);
            onDescentRate(Number.isFinite(v) && v > 0 ? Math.min(200, v) : null);
          }}
          aria-label="Recovery descent rate in feet per second (optional) — turns the winds-aloft mean wind into a landing-drift distance"
          className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center font-mono tabular-nums outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span>ft/s</span>
        {descentRate != null && (
          <button
            type="button"
            onClick={() => onDescentRate(null)}
            className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            clear
          </button>
        )}
      </label>
        </div>
      </div>
    </div>
  );
}
