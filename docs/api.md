# Conditions API

A **free, read-only JSON API** for the current **modeled surface wind** at every curated US launch
field — the data behind the "Conditions across all sites" overview. **No API key, no rate limits, no
cost.** CORS-open (`Access-Control-Allow-Origin: *`) — call it straight from a browser. It's static
JSON — no query parameters; fetch a file and filter client-side. Refreshed about hourly (check
`meta.json` for the exact `generated_at`); served as plain static files, no backend — unmetered on
Cloudflare Pages.

The wire format is **snake_case**, matching the sibling [motor.fusionspace.co](https://motor.fusionspace.co/api)
API exactly. Human-friendly docs: <https://window.fusionspace.co/api>.

## Base URL

```
https://window.fusionspace.co/api/v1
```

| Endpoint | Returns |
|---|---|
| `/conditions.json` | The feed — current surface wind at every field, toned against the 20 mph line. |
| `/meta.json` | Self-describing metadata: schema version, generation time, counts, endpoints, docs, license. |
| `/openapi.json` | OpenAPI 3.1 specification. |

## `conditions.json`

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-07-03T09:37:03.759Z", // ISO; null if the last refresh failed
  "model": "gfs_seamless",
  "count": 104,                                // number of entries in sites
  "sites": [
    {
      "name": "SEARS — Samson",
      "state": "AL",          // USPS two-letter code
      "lat": 31.13,
      "lon": -86.07,          // approximate launch-area point (~1 km)
      "wind_mph": 7,          // sustained surface wind (10 m), rounded to whole mph
      "gust_mph": 11,         // integer | null (null when the model omits it)
      "dir_deg": 270,         // direction the wind blows FROM, degrees (rounded)
      "temp_f": 72,           // integer | null, °F
      "tone": "emerald"       // "emerald" < 15, "amber" 15–20, "red" >= 20 mph
    }
  ]
}
```

`generated_at` is `null` and `sites` may be empty if the most recent refresh couldn't reach the
provider. Fields with no usable wind are omitted from `sites`.

## `meta.json`

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-07-03T09:37:03.759Z",
  "model": "gfs_seamless",
  "counts": { "sites": 104, "states": 48 },
  "endpoints": ["/api/v1/conditions.json", "/api/v1/meta.json", "/api/v1/openapi.json"],
  "docs": "https://window.fusionspace.co/api",
  "license": "Free to use; attribution appreciated; provided as-is",
  "notes": "Modeled surface wind (gfs_seamless), not observed station data …"
}
```

## Example

```sh
# the calmest field right now
curl -s https://window.fusionspace.co/api/v1/conditions.json | jq '.sites | sort_by(.wind_mph)[0]'
```

## Terms

- **Modeled, not observed.** Model surface wind (`gfs_seamless`), not live station readings — it
  leans the picture, it is not authoritative. Confirm on a field's full board or a primary source
  before flying.
- **Best-effort & provided as-is.** Coordinates are ~1 km approximate; the feed can be up to an hour
  stale (or empty on a failed refresh); no warranty — verify before relying on it.
- **Free to use; attribution appreciated.** A credit to `window.fusionspace.co` is appreciated.
  Weather data by [Open-Meteo](https://open-meteo.com) (CC BY 4.0). The code is under the repo's MIT
  license — fork it, deploy your own.

## How it's produced

`scripts/gen-conditions.ts` runs in `prebuild`, makes one **batched** Open-Meteo request for all
field coordinates (reusing the tested `lib/weather/sitefeed.ts`), and writes the JSON under
`public/api/v1/`. The build copies it into the export; an hourly deploy refreshes it, driven by an
external scheduler (cron-job.org) that fires a `repository_dispatch` webhook once an hour. Because Open-Meteo
counts each location, one batched request ≈ 104 weighted calls, so hourly ≈ ~2,500/day of the
10,000/day free non-commercial allowance.
