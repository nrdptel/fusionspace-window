/** Build-time generator for the public conditions API: one batched Open-Meteo request for every
 *  curated launch field, summarised (with the shared, tested lib) into small static JSON under
 *  public/api/v1/ — served as plain static assets (unmetered on Cloudflare Pages: unlimited reads,
 *  no Workers/KV, nothing on any account limit). Free, read-only, no key, no rate limit.
 *
 *  Writes:
 *    public/api/v1/conditions.json — the feed (schema_version, generated_at, model, count, sites[])
 *    public/api/v1/sites.json      — the static field roster (name/state/lat/lon), no weather cost
 *    public/api/v1/meta.json       — self-describing metadata (version, counts, endpoints, docs, …)
 *
 *  Run in `prebuild`, so every deploy bakes in fresh conditions; an hourly deploy refreshes them.
 *  Best-effort: on any failure it writes an empty feed and exits 0, so a flaky provider never
 *  breaks the site build. */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildBatchUrl, summarizeSiteFeed, buildMeta, buildSitesFile, SCHEMA_VERSION, type SiteFeed } from "../lib/weather/sitefeed";
import { SITE_URL } from "../lib/links";

const DIR = join(process.cwd(), "public", "api", "v1");
const TIMEOUT_MS = 20_000;

async function main() {
  const nowIso = new Date().toISOString();
  let feed: SiteFeed = { schema_version: SCHEMA_VERSION, generated_at: null, model: "gfs_seamless", count: 0, sites: [] };

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
    console.log(`gen-conditions: ${feed.count} sites at ${nowIso}`);
  } catch (err) {
    // Best-effort: keep the build green. An empty feed just means the overview is absent this cycle.
    console.warn(`gen-conditions: writing empty feed (${(err as Error).message})`);
  }

  const meta = buildMeta(feed, `${SITE_URL}/api`);
  const sitesFile = buildSitesFile(nowIso);

  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, "conditions.json"), JSON.stringify(feed));
  writeFileSync(join(DIR, "sites.json"), JSON.stringify(sitesFile));
  writeFileSync(join(DIR, "meta.json"), JSON.stringify(meta));
}

main();
