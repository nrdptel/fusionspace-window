/** Build-time generator for the public conditions API: one batched Open-Meteo request for every
 *  curated launch field, summarised (with the shared, tested lib) into small static JSON under
 *  public/api/v1/ — served as plain static assets (unmetered on Cloudflare Pages: unlimited reads,
 *  no Workers/KV, nothing on any account limit). Free, read-only, no key, no rate limit.
 *
 *  Writes:
 *    public/api/v1/conditions.json      — the feed (schema_version, generated_at, model, count, sites[])
 *    public/api/v1/conditions.geojson   — the same feed as a GeoJSON FeatureCollection (for maps)
 *    public/api/v1/sites.json           — the static field roster (name/state/slug/coords/url), no weather cost
 *    public/api/v1/sites/{slug}.json     — one per-field detail file (same data, one site), no extra fetch
 *    public/api/v1/meta.json            — self-describing metadata (version, counts, endpoints, docs, …)
 *
 *  Run in `prebuild`, so every deploy bakes in fresh conditions; an hourly deploy refreshes them.
 *  Best-effort: on any failure it writes an empty feed and exits 0, so a flaky provider never
 *  breaks the site build. */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildBatchUrl, buildAirQualityBatchUrl, summarizeSiteFeed, buildMeta, buildSitesFile,
  buildSiteDetail, buildGeoJson, SCHEMA_VERSION, type SiteFeed,
} from "../lib/weather/sitefeed";
import { LAUNCH_SITES } from "../lib/launchSites";
import { SITE_URL } from "../lib/links";

const DIR = join(process.cwd(), "public", "api", "v1");
const SITES_DIR = join(DIR, "sites");
const TIMEOUT_MS = 20_000;
const UA = "window.fusionspace.co conditions build (https://window.fusionspace.co)";

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const nowIso = new Date().toISOString();
  let feed: SiteFeed = { schema_version: SCHEMA_VERSION, generated_at: null, model: "gfs_seamless", count: 0, sites: [] };

  try {
    const mainRaw = await fetchJson(buildBatchUrl());
    // Air quality is a second, best-effort batched request — a failure here must not lose the feed.
    let aqRaw: unknown = undefined;
    try {
      aqRaw = await fetchJson(buildAirQualityBatchUrl());
    } catch (e) {
      console.warn(`gen-conditions: air quality skipped (${(e as Error).message})`);
    }
    feed = summarizeSiteFeed(mainRaw, nowIso, LAUNCH_SITES, SITE_URL, aqRaw);
    console.log(`gen-conditions: ${feed.count} sites at ${nowIso}`);
  } catch (err) {
    // Best-effort: keep the build green. An empty feed just means the overview is absent this cycle.
    console.warn(`gen-conditions: writing empty feed (${(err as Error).message})`);
  }

  const meta = buildMeta(feed, `${SITE_URL}/api`);
  const sitesFile = buildSitesFile(nowIso);

  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, "conditions.json"), JSON.stringify(feed));
  writeFileSync(join(DIR, "conditions.geojson"), JSON.stringify(buildGeoJson(feed)));
  writeFileSync(join(DIR, "sites.json"), JSON.stringify(sitesFile));
  writeFileSync(join(DIR, "meta.json"), JSON.stringify(meta));

  // One detail file per field (/api/v1/sites/{slug}.json) — no extra fetch, the data's in hand.
  mkdirSync(SITES_DIR, { recursive: true });
  for (const site of feed.sites) {
    writeFileSync(join(SITES_DIR, `${site.slug}.json`), JSON.stringify(buildSiteDetail(feed, site)));
  }
  console.log(`gen-conditions: wrote ${feed.sites.length} per-site detail files`);
}

main();
