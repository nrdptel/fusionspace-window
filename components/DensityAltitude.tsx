"use client";

import type { CurrentConditions, Field } from "@/lib/weather/model";
import { densityAltitudeFt } from "@/lib/weather/density";
import { fmtLength, LENGTH_LABEL, lengthFromFt, resolveUnits, type UnitPrefs } from "@/lib/units";
import { SourceLine } from "./ui";

/** Round to the nearest 50 of the active length unit — DA isn't precise to the foot. */
function roundDisplay(ft: number, unit: ReturnType<typeof resolveUnits>["length"]): string {
  const v = lengthFromFt(ft, unit);
  const step = 50;
  return (Math.round(v / step) * step).toLocaleString("en-US");
}

export default function DensityAltitude({
  current,
  field,
  units,
  model,
}: {
  current: CurrentConditions;
  field: Field;
  units: UnitPrefs;
  model: string;
}) {
  const u = resolveUnits(units);
  const da = densityAltitudeFt({
    tempF: current.tempF,
    rhPct: current.humidityPct,
    pressureHpa: current.surfacePressureHpa,
  });

  if (!Number.isFinite(da)) return null;

  const aboveField = da - field.elevationFt;
  // Factual context only — physics, not a go/no-go. Thin air = less thrust, faster descent,
  // higher (harder to track) flights.
  const thin = aboveField >= 2000;

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Density altitude
          </div>
          <div className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {roundDisplay(da, u.length)}
            <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              {LENGTH_LABEL[u.length]}
            </span>
          </div>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          The air is as thin as a standard day at this altitude — about{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {fmtLength(Math.abs(aboveField), u.length)} {LENGTH_LABEL[u.length]}{" "}
            {aboveField >= 0 ? "above" : "below"}
          </span>{" "}
          the field&apos;s {fmtLength(field.elevationFt, u.length)} {LENGTH_LABEL[u.length]} ground.
          {thin && " Thinner air means a motor makes less thrust, descent is a touch faster, and the rocket climbs higher out of sight — worth a look before you fly."}
        </p>
      </div>
      <SourceLine>
        Derived from the field&apos;s pressure, temperature, and humidity (Open-Meteo, {model})
        via the standard-atmosphere density relation — a meteorological figure, not a verdict.
        Field elevation is shown for context; it isn&apos;t an input.
      </SourceLine>
    </div>
  );
}
