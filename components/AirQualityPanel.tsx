"use client";

import type { AirQuality } from "@/lib/weather/airquality";
import { windToneTextClass } from "@/lib/weather/limits";
import { SourceLine } from "./ui";

export default function AirQualityPanel({ aq }: { aq: AirQuality }) {
  const c = aq.category;
  const toneCls = windToneTextClass(c.tone);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div className={"font-mono text-3xl font-semibold tabular-nums " + toneCls}>
          {aq.usAqi}
          <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">US AQI</span>
        </div>
        <div className={"text-sm font-medium " + toneCls}>{c.label}</div>
      </div>

      <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{c.blurb}</p>

      {(aq.pm25 != null || aq.pm10 != null) && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {aq.pm25 != null && (
            <span>
              PM2.5 (smoke){" "}
              <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                {aq.pm25.toFixed(1)} μg/m³
              </span>
            </span>
          )}
          {aq.pm10 != null && (
            <span>
              PM10 (dust){" "}
              <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                {Math.round(aq.pm10)} μg/m³
              </span>
            </span>
          )}
        </div>
      )}

      <SourceLine>
        US Air Quality Index and particulate from Open-Meteo&apos;s air-quality model (CAMS),
        best-effort — absent if it can&apos;t be reached. Fine particulate (PM2.5) is the smoke
        proxy and coarse (PM10) the dust; both are what cut the visibility you need to track a
        flight. A figure on the standard US scale, not a verdict.
      </SourceLine>
    </div>
  );
}
