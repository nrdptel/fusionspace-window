"use client";

import { useEffect, useState } from "react";
import type { SiteFeed, SiteConditions } from "@/lib/weather/sitefeed";
import { degToCompass } from "@/lib/units";
import { windToneTextClass } from "@/lib/weather/limits";
import { relativeAge } from "@/lib/format";
import { PinIcon } from "./icons";

// Same-origin static feed, written at build time (scripts/gen-conditions.ts) and refreshed by an
// hourly deploy. A plain static asset — unmetered on Cloudflare Pages, no Workers/KV, no limits.
const FEED_PATH = "/conditions.json";

/** An at-a-glance overview of the current modeled surface wind at every curated launch field, from
 *  the pre-fetched static feed (one build-time request, not one per visitor). Sorted calmest-first
 *  so the flyable fields rise to the top; tap one to load its full board. Renders nothing when the
 *  feed is missing or empty (e.g. in dev, or if a build cycle couldn't reach the provider) — a
 *  best-effort extra, never a blocker. Modeled wind only; the observed cross-check is per-field. */
export default function AllSitesConditions({
  onPick,
}: {
  onPick: (lat: number, lon: number, label?: string) => void;
}) {
  const [feed, setFeed] = useState<SiteFeed | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(FEED_PATH)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: SiteFeed) => {
        if (cancelled) return;
        setFeed(data);
        setNow(Date.now());
      })
      .catch(() => {
        /* absent or unreachable — the overview simply doesn't render */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to show until we have a feed with at least one site.
  if (!feed || feed.sites.length === 0) return null;

  const sites = [...feed.sites].sort((a, b) => a.windMph - b.windMph);
  const flyable = sites.filter((s) => s.tone !== "red").length;

  return (
    <details className="mt-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Conditions across all sites{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          — current surface wind at every field, calmest first
        </span>
      </summary>

      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{flyable}</span> of{" "}
          {sites.length} under the 20 mph line ·{" "}
          {feed.generatedAt && now
            ? `as of ${relativeAge(new Date(feed.generatedAt).getTime(), now)}`
            : "modeled"}{" "}
          · modeled surface wind, not observed — open a field for the full read.
        </p>
        <ul className="max-h-96 divide-y divide-zinc-100 overflow-auto dark:divide-zinc-800/70">
          {sites.map((s) => (
            <SiteRow key={s.name} site={s} onPick={onPick} />
          ))}
        </ul>
      </div>
    </details>
  );
}

function SiteRow({
  site,
  onPick,
}: {
  site: SiteConditions;
  onPick: (lat: number, lon: number, label?: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(site.lat, site.lon, site.name)}
        className="flex w-full items-center gap-2 py-1.5 text-left text-sm hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        <span className={"h-2 w-2 shrink-0 rounded-full " + dotClass(site.tone)} aria-hidden="true" />
        <PinIcon className="h-3 w-3 shrink-0 text-zinc-400" />
        <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">{site.name}</span>
        <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">{site.state}</span>
        <span className={"shrink-0 font-mono tabular-nums " + windToneTextClass(site.tone)}>
          {Math.round(site.windMph)} mph {degToCompass(site.dirDeg)}
        </span>
      </button>
    </li>
  );
}

function dotClass(tone: SiteConditions["tone"]): string {
  return tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-500" : "bg-emerald-500";
}
