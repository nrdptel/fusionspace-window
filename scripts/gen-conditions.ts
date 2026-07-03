/** Build-time generator for the public conditions API: one batched Open-Meteo request for every
 *  curated launch field, summarised (with the shared, tested lib) into small static JSON under
 *  public/api/v1/ — served as plain static assets (unmetered on Cloudflare Pages: unlimited reads,
 *  no Workers/KV, nothing on any account limit). Free, read-only, no key, no rate limit.
 *
 *  Writes:
 *    public/api/v1/conditions.json — the feed (schemaVersion, generatedAt, model, sites[])
 *    public/api/v1/meta.json       — lightweight metadata (version, generatedAt, counts)
 *
 *  Run in `prebuild`, so every deploy bakes in fresh conditions; an hourly deploy refreshes them.
 *  Best-effort: on any failure it writes an empty feed and exits 0, so a flaky provider never
 *  breaks the site build. */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildBatchUrl, summarizeSiteFeed, SCHEMA_VERSION, type SiteFeed } from "../lib/weather/sitefeed";

const DIR = join(process.cwd(), "public", "api", "v1");
const TIMEOUT_MS = 20_000;

async function main() {
  const nowIso = new Date().toISOString();
  let feed: SiteFeed = { schemaVersion: SCHEMA_VERSION, generatedAt: null as unknown as string, model: "gfs_seamless", sites: [] };

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

  const meta = {
    schemaVersion: feed.schemaVersion,
    generatedAt: feed.generatedAt,
    model: feed.model,
    siteCount: feed.sites.length,
    stateCount: new Set(feed.sites.map((s) => s.state)).size,
  };

  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, "conditions.json"), JSON.stringify(feed));
  writeFileSync(join(DIR, "meta.json"), JSON.stringify(meta));
}

main();
