"use client";

import { useMemo } from "react";
import type { DayOutlook, HourPoint, Sky } from "@/lib/weather/model";
import {
  fmtLength,
  fmtVisibility,
  LENGTH_LABEL,
  resolveUnits,
  VIS_LABEL,
  type UnitPrefs,
} from "@/lib/units";
import { clockShort, dayLabel, relativeAge } from "@/lib/format";
import { ceilingRead } from "@/lib/weather/ceiling";
import { lowCloudOutlook, lowCloudHeadline, lowCloudRead } from "@/lib/weather/lowcloud";
import { windToneTextClass, type WindTone } from "@/lib/weather/limits";
import { Card, Pill, SourceLine } from "./ui";

const LOW_CLOUD_FILL: Record<WindTone, string> = {
  emerald: "fill-emerald-400 dark:fill-emerald-500",
  amber: "fill-amber-400 dark:fill-amber-500",
  red: "fill-red-400 dark:fill-red-500",
};

export default function SkyPanel({
  sky,
  daily,
  units,
  todayIso,
  now,
  modeledVisibilityMi,
  apogee,
  lowCloudHourly,
}: {
  sky: Sky;
  daily: DayOutlook[];
  units: UnitPrefs;
  todayIso: string;
  now: number;
  /** Current-hour modeled visibility (statute miles), the fallback when no station reports it. */
  modeledVisibilityMi: number;
  /** Expected apogee (feet AGL), or null — turns the ceiling into a go/no-go clearance read. */
  apogee: number | null;
  /** Forward window of hourly points (from the current hour) for the low-cloud outlook. */
  lowCloudHourly: HourPoint[];
}) {
  const u = resolveUnits(units);
  const apogeeLen = apogee != null ? `${fmtLength(apogee, u.length)} ${LENGTH_LABEL[u.length]}` : "";

  const lowCloud = useMemo(() => lowCloudOutlook(lowCloudHourly), [lowCloudHourly]);

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

              {/* Observed present weather — thunderstorm / precip / obscuration at the station. */}
              {sky.presentWeather && sky.presentWeather.labels.length > 0 && (
                <p className="mt-2 text-sm">
                  <span className={"font-semibold " + windToneTextClass(sky.presentWeather.tone)}>
                    {sky.presentWeather.labels.join(", ")}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {" "}
                    · observed now
                    {sky.presentWeather.thunderstorm || sky.presentWeather.precip
                      ? " — a launch no-go"
                      : " — cutting visibility"}
                  </span>
                </p>
              )}

              {/* Clearance against the expected apogee, when one is set. */}
              {apogee != null &&
                (sky.ceilingFt != null ? (
                  (() => {
                    const r = ceilingRead(sky.ceilingFt, apogee);
                    const abs = `${fmtLength(Math.abs(r.marginFt), u.length)} ${LENGTH_LABEL[u.length]}`;
                    const detail =
                      r.marginFt <= 0
                        ? `your ${apogeeLen} peak is ${abs} into the deck`
                        : r.status === "Tight"
                          ? `only ${abs} of room below your ${apogeeLen} peak`
                          : `${abs} of room below your ${apogeeLen} peak`;
                    return (
                      <p className="mt-2 text-sm">
                        <span className={"font-semibold " + windToneTextClass(r.tone)}>{r.status}</span>
                        <span className="text-zinc-600 dark:text-zinc-400"> · {detail}</span>
                      </p>
                    );
                  })()
                ) : (
                  <p className="mt-2 text-sm">
                    <span className={"font-semibold " + windToneTextClass("emerald")}>Clear</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {" "}
                      · sky is open above your {apogeeLen} peak
                    </span>
                  </p>
                ))}

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

      {/* Low-cloud outlook — the forward-looking companion to the now-only observed ceiling. */}
      {lowCloud && (
        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Low cloud · next 3 days
            </span>
            <Pill tone="amber">Modeled</Pill>
          </div>
          <p className="mt-1 text-sm">
            <span className={"font-medium " + windToneTextClass(lowCloud.peak.tone)}>
              {lowCloudHeadline(
                lowCloud,
                (iso) => `${dayLabel(iso, todayIso)} ${clockShort(iso)}`,
              )}
            </span>
          </p>
          {(() => {
            const CW = 5;
            const CH = 16;
            const BOT = 12;
            const W = lowCloudHourly.length * CW;
            const H = CH + BOT;
            return (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width={W}
                height={H}
                role="img"
                aria-label={`Modeled low-cloud cover, next ${lowCloudHourly.length} hours. ${lowCloudHeadline(
                  lowCloud,
                  (iso) => `${dayLabel(iso, todayIso)} ${clockShort(iso)}`,
                )}.`}
                className="mt-2 max-w-full"
              >
                <line x1={0} y1={CH} x2={W} y2={CH} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />
                {lowCloudHourly.map((h, i) => {
                  const pct = Number.isFinite(h.cloudCoverLowPct) ? h.cloudCoverLowPct : 0;
                  const barH = Math.max(1, (CH * Math.max(0, Math.min(100, pct))) / 100);
                  return (
                    <rect
                      key={i}
                      x={i * CW}
                      y={CH - barH}
                      width={CW - 1}
                      height={barH}
                      rx="0.5"
                      className={LOW_CLOUD_FILL[lowCloudRead(pct).tone]}
                    >
                      <title>{`${dayLabel(h.time, todayIso)} ${clockShort(h.time)} — ${Math.round(pct)}% low cloud`}</title>
                    </rect>
                  );
                })}
                {lowCloudHourly.map((h, i) => {
                  if (!h.time.endsWith("T00:00") || i === 0) return null;
                  return (
                    <g key={`d${i}`}>
                      <line x1={i * CW} y1={0} x2={i * CW} y2={CH} className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1" />
                      <text x={i * CW + 2} y={H - 2} className="fill-zinc-500 dark:fill-zinc-400" fontSize="8">
                        {dayLabel(h.time, todayIso)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
          <SourceLine>
            Modeled low-cloud cover from Open-Meteo — the forward-looking companion to the
            observed ceiling. Low cloud is the layer that usually forms a launch-blocking ceiling;
            high cloud doesn&apos;t. It&apos;s cover, not a forecast ceiling height, so treat it as a
            heads-up — the observed ceiling above keeps the go/no-go.
          </SourceLine>
        </div>
      )}

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
            {apogee != null &&
              " The clearance read compares the observed ceiling with your expected apogee — you can't fly into cloud under a waiver, so a peak at the deck is a no-go."}
          </>
        ) : (
          <>Cloud cover and visibility modeled by Open-Meteo. A forecast ceiling in feet (TAF) is planned for a later version.</>
        )}
      </SourceLine>
    </Card>
  );
}
