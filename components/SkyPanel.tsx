"use client";

import type { DayOutlook, Sky } from "@/lib/weather/model";
import {
  fmtLength,
  fmtVisibility,
  LENGTH_LABEL,
  resolveUnits,
  VIS_LABEL,
  type UnitPrefs,
} from "@/lib/units";
import { dayLabel, relativeAge } from "@/lib/format";
import { Card, Pill, SourceLine } from "./ui";

export default function SkyPanel({
  sky,
  daily,
  units,
  todayIso,
  now,
  modeledVisibilityMi,
}: {
  sky: Sky;
  daily: DayOutlook[];
  units: UnitPrefs;
  todayIso: string;
  now: number;
  /** Current-hour modeled visibility (statute miles), the fallback when no station reports it. */
  modeledVisibilityMi: number;
}) {
  const u = resolveUnits(units);

  // Visibility prefers the station observation; otherwise the model fills in.
  const observedVisMi = sky.source === "station" ? sky.visibilityMi : null;
  const visMi = observedVisMi != null ? observedVisMi : modeledVisibilityMi;
  const visObserved = observedVisMi != null;
  return (
    <Card>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          {sky.source === "station" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Ceiling</span>
                <Pill tone="sky">Observed</Pill>
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {sky.ceilingFt != null ? (
                  <>
                    {fmtLength(sky.ceilingFt, u.length)}
                    <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{LENGTH_LABEL[u.length]}</span>
                  </>
                ) : (
                  <span className="text-xl">No ceiling</span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {sky.description}
                {sky.ceilingFt == null && " — no broken or overcast layer reported"}
              </p>
              {sky.layers && sky.layers.length > 0 && (
                <ul className="mt-2 space-y-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {sky.layers.map((l, i) => (
                    <li key={i}>
                      {l.amount}
                      {l.baseFt != null
                        ? ` @ ${fmtLength(l.baseFt, u.length)} ${LENGTH_LABEL[u.length]}`
                        : ""}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cloud cover</span>
                <Pill tone="amber">Modeled</Pill>
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {Math.round(sky.cloudCoverPct ?? 0)}
                <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">%</span>
              </div>
              <p className="mt-1 max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
                No nearby reporting station was reachable, so this is the model&apos;s cloud
                cover, not an observed ceiling.
              </p>
            </>
          )}

          {Number.isFinite(visMi) && (
            <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Visibility</span>
                <Pill tone={visObserved ? "sky" : "amber"}>{visObserved ? "Observed" : "Modeled"}</Pill>
              </div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {fmtVisibility(visMi, u.length)}
                <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{VIS_LABEL[u.length]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Multi-day sky picture — always modeled cloud cover. */}
        <div className="md:text-right">
          <div className="flex items-center gap-2 md:justify-end">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Daily cloud</span>
            <Pill tone="amber">Modeled</Pill>
          </div>
          <div className="mt-2 flex gap-1.5">
            {daily.slice(0, 7).map((d) => {
              const pct = d.cloudCoverMeanPct ?? 0;
              return (
                <div key={d.date} className="flex w-9 flex-col items-center gap-1">
                  <div
                    className="flex h-16 w-3.5 items-end overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                    title={`${dayLabel(d.date, todayIso)}: ${Math.round(pct)}% cloud`}
                  >
                    <div
                      className="w-full rounded-full bg-sky-400/70 dark:bg-sky-500/60"
                      style={{ height: `${Math.max(2, Math.min(100, pct))}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{dayLabel(d.date, todayIso).slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sky.source === "station" && sky.raw && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Show the raw report (METAR)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            {sky.raw}
          </pre>
        </details>
      )}

      <SourceLine>
        {sky.source === "station" && sky.station ? (
          <>
            Observed at {sky.station.name} ({sky.station.id})
            {sky.station.distanceMi != null && ` · ${Math.round(sky.station.distanceMi)} mi away`}
            {sky.station.time && ` · ${relativeAge(Date.parse(sky.station.time), now)}`} · NWS
            METAR. Visibility {visObserved ? "is the station's observed value" : "is modeled (Open-Meteo); the station reported none"}.
            Daily cloud cover is modeled (Open-Meteo).
          </>
        ) : (
          <>Cloud cover and visibility modeled by Open-Meteo. A forecast ceiling in feet (TAF) is planned for a later version.</>
        )}
      </SourceLine>
    </Card>
  );
}
