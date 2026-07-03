# Conditions feed Worker

A scheduled Cloudflare Worker that publishes the **"all sites at a glance"** feed: the current
modeled surface wind at every curated launch field (`lib/launchSites.ts`), in one small JSON the
site reads for its overview — so a flyer near several clubs sees which are flyable now without
opening each, and no visitor's browser fetches 100+ fields.

- **Cron** (`wrangler.jsonc`, every 15 min) → one **batched** Open-Meteo request for all fields →
  `summarizeSiteFeed` (shared, tested, in `lib/weather/sitefeed.ts`) → stored in KV under one key.
- **HTTP GET** → serves the stored feed, CORS-enabled, `cache-control: public, max-age=300`.

Modeled wind only (`gfs_seamless`), the same model the board uses — **not** observed station data.
The live station cross-check stays in the per-field view.

## Cost (all free tier)

- **Open-Meteo:** one call per cycle. It bills by *weighted* calls (`locations × days/14 × vars/10`),
  so ~104 fields × current-only ≈ **9 weighted calls/cycle → ~850/day**, of the **10,000/day**
  free non-commercial allowance. Free as long as the site has no ads/subscription (attribution to
  Open-Meteo is already on the site).
- **Cloudflare KV:** one write per cycle = **96 writes/day** of the **1,000/day** free limit. Keep
  it to the single combined key (writing per-field keys would blow the limit).
- **Workers:** cron + a trickle of reads, far under the 100k requests/day free plan. No card needed.

## One-time setup

1. **Create the KV namespace** and paste its id into `wrangler.jsonc`:
   ```sh
   cd workers/conditions
   npx wrangler kv namespace create CONDITIONS
   # → copy the printed id into kv_namespaces[0].id (replace REPLACE_WITH_KV_NAMESPACE_ID)
   ```
2. **Token scopes.** The existing `CLOUDFLARE_API_TOKEN` GitHub secret (used for Pages) needs, in
   addition to Pages: **Account → Workers Scripts: Edit** and **Account → Workers KV Storage: Edit**.
3. **Deploy the Worker** — push to `main` (the `deploy-worker` workflow fires) or manually:
   ```sh
   npx wrangler deploy   # from workers/conditions
   ```
   Note the URL it prints, e.g. `https://fusionspace-window-conditions.<subdomain>.workers.dev`.
4. **Light up the site overview.** Add a GitHub **repository variable** (Settings → Secrets and
   variables → Actions → Variables) named **`CONDITIONS_URL`** = that Worker URL, then re-run the
   site deploy. Until it's set, the overview is simply absent (the site builds and works without it).

To go lighter, change the cron in `wrangler.jsonc` to `*/30 * * * *` (Open-Meteo's model only
updates hourly, so 15–30 min is the honest range; 10 min works too but adds little).

## Local check

```sh
cd workers/conditions
npx wrangler dev            # serves the fetch handler; visit / to see the feed JSON
```
The wind-toning logic itself is unit-tested in `lib/weather/sitefeed.test.ts` (run `npm test`).
