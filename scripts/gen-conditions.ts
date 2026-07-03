/** Build-time generator for the "all sites" conditions feed: one batched Open-Meteo request for
 *  every curated launch field, summarised (with the shared, tested lib) into a small static JSON
 *  at public/conditions.json — copied into the export and served as a plain static asset (which is
 *  unmetered on Cloudflare Pages: unlimited reads, no Workers/KV, nothing on any account limit).
 *
 *  Run in `prebuild`, so every deploy bakes in fresh conditions; an hourly deploy (schedule or a
 *  cron-job.org webhook → repository_dispatch) refreshes it. Best-effort: on any failure it writes
 *  an empty feed and exits 0, so a flaky provider never breaks the site build. */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildBatchUrl, summarizeSiteFeed, type SiteFeed } from "../lib/weather/sitefeed";

const OUT = join(process.cwd(), "public", "conditions.json");
const TIMEOUT_MS = 20_000;

async function main() {
  const nowIso = new Date().toISOString();
  let feed: SiteFeed = { generatedAt: null as unknown as string, model: "gfs_seamless", sites: [] };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(buildBatchUrl(), {
      signal: ctrl.signal,
      headers: { "user-agent": "window.fusionspace.co conditions build (https://window.fusionspace.co)" },
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`open-meteo responded ${res.status}`);
    feed = summarizeSiteFeed(await res.json(), nowIso);
    console.log(`gen-conditions: ${feed.sites.length} sites at ${nowIso}`);
  } catch (err) {
    // Best-effort: keep the build green. An empty feed just means the overview is absent this cycle.
    console.warn(`gen-conditions: writing empty feed (${(err as Error).message})`);
  }

  mkdirSync(join(process.cwd(), "public"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(feed));
}

main();
