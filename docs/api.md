# Conditions API

A **free, read-only JSON API** for the current **modeled conditions** at every curated US launch
field — wind and steadiness, density altitude, storm potential (CAPE), the moisture read, sky, and
today's forecast peaks. **No API key, no rate limits, no cost.** CORS-open
(`Access-Control-Allow-Origin: *`) — call it straight from a browser. It's static JSON — no query
parameters; fetch a file and filter client-side. Refreshed about hourly (check `meta.json` for the
exact `generated_at`); served as plain static files, no backend — unmetered on Cloudflare Pages.

The wire format is **snake_case**, matching the sibling [motor.fusionspace.co](https://motor.fusionspace.co/api)
API exactly. Human-friendly docs: <https://window.fusionspace.co/api>.

## Base URL

```
https://window.fusionspace.co/api/v1
```

| Endpoint | Returns |
|---|---|
| `/conditions.json` | The feed — current conditions at every field (wind, density altitude, storm potential, moisture, sky, today's peaks). |
| `/sites.json` | The curated field roster — name, state, coordinates. Static, no weather data. |
| `/meta.json` | Self-describing metadata: schema version, generation time, counts, endpoints, docs, license. |
| `/openapi.json` | OpenAPI 3.1 specification. |

## `conditions.json`

Every value is **rounded** to a whole number (density altitude to 10 ft). Any field can be `null`
when the model omits it — that never drops the whole site; only a missing usable wind does.

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-07-03T09:37:03.759Z", // ISO; null if the last refresh failed
  "model": "gfs_seamless",
  "count": 104,                                // number of entries in sites
  "sites": [
    {
      "name": "SEARS — Samson",
      "state": "AL",                // USPS two-letter code
      "lat": 31.13,
      "lon": -86.07,                // approximate launch-area point (~1 km)
      "wind_mph": 3,                // sustained surface wind (10 m)
      "gust_mph": 3,                // integer | null
      "dir_deg": 32,                // direction the wind blows FROM, degrees
      "steadiness": "steady",       // "steady" | "gusty" | "very-gusty" | null — gust vs. sustained
      "temp_f": 73,                 // integer | null
      "apparent_temp_f": 80,        // "feels like", integer | null
      "humidity_pct": 93,           // integer | null
      "dewpoint_f": 71,             // integer | null — tight spread ⇒ fog/condensation risk
      "pressure_hpa": 1013,         // station pressure, integer | null
      "density_altitude_ft": 1240,  // to 10 ft | null — thin air cuts thrust & speeds descent
      "cape_jkg": 610,              // convective energy, integer | null
      "storm": "marginal",          // "none" | "marginal" | "moderate" | "strong" | null
      "cloud_cover_pct": 7,         // integer | null
      "tone": "emerald",            // "emerald" < 15, "amber" 15–20, "red" >= 20 mph
      "today": {                    // today's forecast peaks | null
        "max_wind_mph": 5,
        "max_gust_mph": 10,
        "high_f": 93,
        "low_f": 72,
        "precip_chance_pct": 2
      }
    }
  ]
}
```

`generated_at` is `null` and `sites` may be empty if the most recent refresh couldn't reach the
provider. Fields with no usable wind are omitted from `sites`.

## `sites.json`

The curated field roster on its own, with **no weather-API cost** — just the static list.

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-07-03T09:37:03.759Z",
  "count": 104,
  "sites": [
    { "name": "SEARS — Samson", "state": "AL", "lat": 31.13, "lon": -86.07 }
  ]
}
```

## `meta.json`

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-07-03T09:37:03.759Z",
  "model": "gfs_seamless",
  "counts": { "sites": 104, "states": 48 },
  "endpoints": ["/api/v1/conditions.json", "/api/v1/sites.json", "/api/v1/meta.json", "/api/v1/openapi.json"],
  "docs": "https://window.fusionspace.co/api",
  "license": "Free to use; attribution appreciated; provided as-is",
  "notes": "Modeled conditions (gfs_seamless), not observed station data …"
}
```

## Example

```sh
# the calmest field right now
curl -s https://window.fusionspace.co/api/v1/conditions.json | jq '.sites | sort_by(.wind_mph)[0]'
```

## Terms

- **Modeled, not observed.** Modeled conditions (`gfs_seamless`), not live station readings — they
  lean the picture, they are not authoritative. Density altitude, CAPE, and the rest are derived
  from the same model. Confirm on a field's full board or a primary source before flying.
- **Best-effort & provided as-is.** Coordinates are ~1 km approximate; the feed can be up to an hour
  stale (or empty on a failed refresh); no warranty — verify before relying on it.
- **Free to use; attribution appreciated.** A credit to `window.fusionspace.co` is appreciated.
  Weather data by [Open-Meteo](https://open-meteo.com) (CC BY 4.0). The code is under the repo's MIT
  license — fork it, deploy your own.

## How it's produced

`scripts/gen-conditions.ts` runs in `prebuild`, makes **one batched** Open-Meteo request for all
field coordinates (a current block plus a single daily block), and summarises it with the tested
`lib/weather/sitefeed.ts` — density altitude, dew point, storm band, and steadiness are computed by
the same calculators the board uses, so the API and the board can't drift. It writes the JSON under
`public/api/v1/` (`sites.json` needs no request at all — it's the static roster). The build copies it
into the export; an hourly deploy refreshes it, driven by an external scheduler (cron-job.org) that
fires a `repository_dispatch` webhook once an hour. Open-Meteo counts each **location** (extra
variables on a single current+daily request barely add weight), so it stays ≈ one batched call per
refresh — hourly is a few thousand/day, comfortably under the 10,000/day free non-commercial
allowance. Static serving to consumers is separate and unmetered.
