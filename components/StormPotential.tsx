"use client";

import type { CurrentConditions, HourPoint } from "@/lib/weather/model";
import { classifyCape, peakCape } from "@/lib/weather/instability";
import { clockShort, dayLabel } from "@/lib/format";
import { Card, Pill, SourceLine } from "./ui";

export default function StormPotential({
  current,
  hourly,
  fromIndex,
  todayIso,
  model,
}: {
  current: CurrentConditions;
  hourly: HourPoint[];
  fromIndex: number;
  todayIso: string;
  model: string;
}) {
  const now = classifyCape(current.capeJkg);
  const peak = peakCape(
    hourly.map((h) => ({ time: h.time, capeJkg: h.capeJkg })),
    fromIndex,
    24,
  );
  const peakBand = peak ? classifyCape(peak.valueJkg) : now;
  // Headline the worse of now / the day's peak — that's what matters for planning.
  const head = peakBand.band === "none" ? now : peakBand;

  const peakLine = (() => {
    if (!peak || peak.valueJkg < 300) return "Stays stable through the day.";
    const when = peak.index <= fromIndex + 1 ? "now" : `around ${dayLabel(peak.time, todayIso)} ${clockShort(peak.time)}`;
    return `Builds to ${peakBand.label.toLowerCase()} (~${Math.round(peak.valueJkg).toLocaleString("en-US")} J/kg) ${when}.`;
  })();

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <Pill tone={head.tone}>{head.label}</Pill>
          <span className="font-mono text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
            CAPE now {Number.isFinite(current.capeJkg) ? Math.round(current.capeJkg).toLocaleString("en-US") : "—"} J/kg
          </span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{peakLine}</p>
      </div>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {head.blurb} Afternoon thunderstorms cancel more summer launches than wind does — this is a
        heads-up to watch the sky, not a verdict.
      </p>
      <SourceLine>
        Convective instability from Open-Meteo ({model}) CAPE — the standard measure of how
        primed the air is to build storms. Bands follow common Storm Prediction Center usage.
      </SourceLine>
    </Card>
  );
}
