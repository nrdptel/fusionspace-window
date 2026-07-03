/** Scheduled Cloudflare Worker: the "all sites at a glance" conditions feed.
 *
 *  A cron trigger (see wrangler.jsonc — every 15 min) fires scheduled(), which makes ONE batched
 *  Open-Meteo request for every curated launch field, summarises it to a small JSON feed, and
 *  stores it in KV under a single key. fetch() serves that stored feed as a public, CORS-enabled,
 *  edge-cached endpoint the static site reads for its overview.
 *
 *  Cost posture (see docs): one Open-Meteo call per cycle (~9 weighted calls of the 10,000/day
 *  free allowance) and one KV write per cycle (96/day of the 1,000/day free limit). All free tier.
 *
 *  The wind logic lives in the shared, unit-tested lib (../../../lib/weather/sitefeed) so the feed
 *  and the board's per-field view can't drift on how a wind is toned. */

import { buildBatchUrl, summarizeSiteFeed } from "../../../lib/weather/sitefeed";

// Minimal Cloudflare runtime types — declared inline so the Worker needs no extra dependency.
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
interface Env {
  CONDITIONS: KVNamespace;
}
interface ScheduledController {
  scheduledTime: number;
}
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const KEY = "latest";
// A contact-bearing User-Agent is the polite thing to send; harmless for Open-Meteo.
const USER_AGENT = "window.fusionspace.co conditions feed (https://window.fusionspace.co)";

/** Fetch the batched forecast, summarise it, and store the feed. Throws on a non-OK response so a
 *  failed cycle leaves the last good feed in place rather than overwriting it with garbage. */
async function refresh(env: Env, generatedAtIso: string): Promise<void> {
  const res = await fetch(buildBatchUrl(), { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`open-meteo responded ${res.status}`);
  const raw = await res.json();
  const feed = summarizeSiteFeed(raw, generatedAtIso);
  await env.CONDITIONS.put(KEY, JSON.stringify(feed));
}

export default {
  // Cron: refresh the stored feed. waitUntil keeps the Worker alive until the store completes.
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refresh(env, new Date(controller.scheduledTime).toISOString()));
  },

  // HTTP: serve the stored feed. If KV is still empty (before the first cron after a fresh deploy),
  // do a one-time lazy refresh so the endpoint is never blank.
  async fetch(_request: Request, env: Env): Promise<Response> {
    let body = await env.CONDITIONS.get(KEY);
    if (!body) {
      try {
        await refresh(env, new Date().toISOString());
        body = await env.CONDITIONS.get(KEY);
      } catch {
        /* fall through to the empty feed below */
      }
    }
    return new Response(body ?? '{"generatedAt":null,"model":"gfs_seamless","sites":[]}', {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        // Let browsers/edge hold the feed for 5 min — well under the 15-min refresh, so a reader
        // never sees data older than one cycle, and repeat visits don't re-hit the Worker.
        "cache-control": "public, max-age=300",
      },
    });
  },
};
