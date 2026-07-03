"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteFeed, SiteConditions } from "@/lib/weather/sitefeed";
import { degToCompass } from "@/lib/units";
import { windToneTextClass } from "@/lib/weather/limits";
import { relativeAge } from "@/lib/format";
import { PinIcon } from "./icons";

// Build-time endpoint of the conditions Worker (e.g. https://…workers.dev). When unset, the whole
// overview is absent — the feature is opt-in and the site builds/works without it.
const FEED_URL = process.env.NEXT_PUBLIC_CONDITIONS_URL;

/** An at-a-glance overview of the current modeled surface wind at every curated launch field,
 *  from the pre-fetched feed (one Worker request every 15 min, not one per visitor). Sorted
 *  calmest-first so the flyable fields rise to the top; tap one to load its full board. Absent
 *  entirely when the feed URL isn't configured or the fetch fails — a best-effort extra, never a
 *  blocker. Modeled wind only; the observed station cross-check lives in the per-field view. */
export default function AllSitesConditions({
  onPick,
}: {
  onPick: (lat: number, lon: number, label?: string) => void;
}) {
  const [feed, setFeed] = useState<SiteFeed | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [now, setNow] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  // Fetch at most once (per success). A ref, not state, so it doesn't re-trigger the effect — the
  // effect depends only on `open`, so the setState calls inside it can't cancel their own fetch.
  const started = useRef(false);

  useEffect(() => {
    if (!FEED_URL || !open || started.current) return;
    started.current = true;
    let cancelled = false;
    setState("loading");
    fetch(FEED_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: SiteFeed) => {
        if (cancelled) return;
        setFeed(data);
        setNow(Date.now());
        setState("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
        started.current = false; // let a later re-open retry
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!FEED_URL) return null;

  const sites = feed ? [...feed.sites].sort((a, b) => a.windMph - b.windMph) : [];
  const flyable = sites.filter((s) => s.tone !== "red").length;

  return (
    <details
      className="mt-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Conditions across all sites{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          — current surface wind at every field, calmest first
        </span>
      </summary>

      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {state === "loading" && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading current conditions…</p>
        )}
        {state === "error" && (
          <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
            The all-sites feed couldn&apos;t be reached just now — pick a field below to load it directly.
          </p>
        )}

        {feed && (
          <>
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
          </>
        )}
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
        <span
          className={"h-2 w-2 shrink-0 rounded-full " + dotClass(site.tone)}
          aria-hidden="true"
        />
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
  return tone === "red"
    ? "bg-red-500"
    : tone === "amber"
      ? "bg-amber-500"
      : "bg-emerald-500";
}
