# Window

Launch weather for high-power and model rocketry. You give it a launch field; it shows the
weather a flyer needs to decide whether to fly — surface wind against the safety limit, winds
aloft up to waiver altitude, density altitude, storm potential, cloud ceiling and visibility,
and a multi-day outlook — in one glanceable, honest view.

It is **purely informational.** It takes no rocket parameters and produces no go/no-go
verdict. It surfaces the data and the relevant reference lines — the 20 mph NFPA/NAR/Tripoli
surface-wind limit, winds aloft, the ceiling — and leaves the call to you and your field's
rules. Every figure carries its source and valid time.

Part of [Fusion Space](https://fusionspace.co) — free, careful tools for the hobby. Live at
**[window.fusionspace.co](https://window.fusionspace.co)**.

## What it shows

- **Right now** — surface wind, gust, and direction against the 20 mph launch limit, with a
  **steadiness** read that flags gusty, turbulent air the sustained limit misses, and the model
  figure cross-checked against the nearest station's *observed* wind; plus temperature, sky,
  **density altitude** (how thin the air is, which sets thrust and descent), a **pressure
  tendency** so you can see the barometer rising or falling, and the **dew point** with its
  temperature spread — a tight spread warns of fog and condensation on cold gear. Winds are named
  for the direction they blow *from*.
- **Storm potential** — convective instability (CAPE), now and the day's peak, sorted into the
  bands meteorologists use — so a calm morning that towers up by mid-afternoon doesn't catch
  you out.
- **The next 3 days** — an hourly wind timeline with the upcoming **calm windows** surfaced
  above it. Drag the **fly-time** slider (or tap a window) to any hour and a snapshot shows that
  hour's wind, density altitude, and storm potential — and the winds-aloft profile follows it.
- **Conditions at a glance** — the next 3 days as four colored rows (wind, gusts, storms,
  rain), each against its own line, so you can spot a window where everything clears at once. Tap
  a column to set the fly-time. No blended verdict — the rows stay separate, the call stays yours.
- **Winds aloft** — the signature panel: wind speed and direction by true height above the
  field, surface up to waiver altitudes, mapped from pressure-level geopotential heights. It
  flags the strongest **shear** layer, the column's **mean wind** (which way *and how far*
  recovery drifts), and the **0°C** level. The thing general weather apps bury or cap low.
  Give a **descent rate** (and your apogee) and the mean wind becomes an actual **landing-drift
  distance** — the rule of thumb (wind ÷ descent rate = drift per foot of altitude) made exact.
  Switch to **dual deploy** and it splits into a fast drogue and a slow main, each drifting on its
  own band's wind and vector-summed, with the drogue and main legs broken out.
- **Sky & ceiling** — the observed ceiling and **visibility** from the nearest reporting station
  where there is one (labeled *observed*, with the raw METAR a click away), with a modeled
  multi-day cloud picture beside it. Set an **expected apogee** and the ceiling is read as a
  go/no-go gate — you can't fly into cloud under a waiver, so a peak at the deck is a *No-go*.
  A **low-cloud outlook** (modeled) sits alongside as the forward-looking companion: the observed
  ceiling is now-only, this flags low cloud building over the next 3 days before you drive out.
  **Observed weather** from the nearest METAR flags a reported **thunderstorm** or **precipitation**
  (the safety code's other no-go) and visibility-cutting **haze/smoke** — the observed counterpart
  to the modeled storm potential.
- **Air quality & smoke** — the US AQI and the smoke (PM2.5) / dust (PM10) particulate, because
  haze cuts the visibility you need to track a high flight and a smoked-out field is a real scrub.
- **Active alerts** — NWS watches, warnings, and advisories for the field.
- **The next several days** — a ~7-day outlook with each day's **calmest flyable window** and
  sunrise/sunset, set against the field's **seasonal normal** (is this week windier than typical,
  or about average?): the "is the drive worth it" view.
- **Field briefing** — "Copy briefing" assembles a plain-text summary of the conditions for the
  club chat; "Copy link" shares the exact view.
- **How this is derived** — source, model, valid time, and limits for every figure.

US-first, imperial defaults (mph, ft, °F) with a units toggle (metric, and knots for wind).
Pick a field by place search, your location, coordinates, or the **Sites** picker — ~100 active
US club launch fields across 48 states, grouped by state (SEARS, HARA, Black Rock, Lucerne, Argonia…). The field rides in the URL, so any
view is a shareable, reload-proof link; units, saved fields, and your personal wind line stay in
your browser. Each saved field shows its current wind at a glance, so a club running more than
one site can see which is flyable without opening each one. An **all-sites overview** lists the whole
roster calmest-first so you can spot where to drive — from a static feed generated at
build time (`scripts/gen-conditions.ts`) and refreshed by an hourly deploy, served as an unmetered
static asset (no backend, no per-request limits).

That same feed is a **[free public JSON API](https://window.fusionspace.co/api)** — current
modeled conditions at every field (wind and steadiness, density altitude, storm potential, the
moisture read, sky, and today's peaks), `Access-Control-Allow-Origin: *`, no key, no rate limit, no
cost. Versioned under `/api/v1/` — the whole-roster `conditions.json` (and `conditions.geojson` for
maps), a per-field `sites/{slug}.json`, the static `sites.json`, plus `meta.json` and `openapi.json`;
docs at [`/api`](https://window.fusionspace.co/api) and [`docs/api.md`](docs/api.md), mirroring the
conventions of the sibling [motor.fusionspace.co](https://motor.fusionspace.co/api) API.

## The data

All fetched client-side, in your browser, from free, keyless, CORS-friendly public APIs —
there is no backend.

- **[Open-Meteo](https://open-meteo.com)** Forecast API — the backbone, and the one hard
  dependency: current, hourly, and daily surface variables plus pressure-level winds for the
  aloft profile, in a single request using a US-optimized GFS/HRRR blend (`gfs_seamless`). Its
  Geocoding API powers place search. (CC BY 4.0.)
- **[NOAA / National Weather Service](https://www.weather.gov)** — active alerts and the
  nearest station's latest observation (a METAR): the observed ceiling, visibility, and surface
  wind, plus the raw report. A graceful-degradation enhancement, not a dependency: if it can't be
  reached, alerts are absent, the observed cross-checks drop out, and the sky falls back to
  modeled cloud cover and visibility.
- **Open-Meteo Historical Archive** — about five years of the field's daily max wind for the
  "vs typical" seasonal normal in the outlook. Best-effort in the same way: absent if the lookup
  doesn't land, and the forecast stays the only hard dependency.
- **Open-Meteo Air-Quality API** (CAMS) — the US AQI plus PM2.5/PM10 particulate for the air
  quality & smoke read. Best-effort too: absent if it can't be reached.

Winds aloft is Open-Meteo only — NOAA retired the public RAP/rucsoundings upper-air feed for
the continental US, so there is no better free source.

When you're offline or a fetch fails, Window shows the last data it loaded for that field with
a prominent "as of" staleness flag — never an error in place of data, and never a stale
reading dressed as fresh. The service worker caches only the app shell for instant load and
installability; it never caches a forecast, so freshness is always real.

## Stack

Next.js (App Router) statically exported (`output: "export"`), Tailwind v4, Geist, TypeScript,
Node 20 — the same stack as the rest of Fusion Space. It builds to plain static files in
`out/` with no server runtime, and deploys to Cloudflare Pages via Wrangler in GitHub Actions.

The data layer is split the family's way: a thin, impure network layer (`lib/weather/net.ts`)
and pure, tested deriving in `lib/` — Open-Meteo → view model, pressure levels → AGL profile,
METAR → ceiling/visibility/observed wind, plus density altitude, CAPE bands, wind shear, the
column mean wind, calm windows, pressure tendency, the freezing level, the text briefing, and
the unit conversions — each with tests and fixtures alongside. The unit tests and the Playwright
e2e (which stubs the APIs by route interception) never touch the live providers, so CI is
deterministic.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

### Checks (these mirror CI)

```bash
npm run lint       # eslint
npm test           # vitest unit tests — fixtures only, no network
npm run build      # static export to out/ (also type-checks)
npm run test:e2e   # Playwright with the APIs stubbed, incl. an axe a11y audit (run after a build)
```

## Deploy

Push to `main`. GitHub Actions builds the static export and ships `out/` to the
`fusionspace-window` Cloudflare Pages project with `cloudflare/wrangler-action` (no Cloudflare
Git integration). An hourly rebuild — triggered by an external scheduler (cron-job.org) firing a
`repository_dispatch` webhook — refreshes the conditions feed and rolls the awareness-month
observance over with the calendar. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repo secrets;
`NEXT_PUBLIC_SITE_URL` defaults to the production origin and is fork-overridable.

## Privacy

No accounts, no analytics, no tracking of any kind. The only third parties are the weather
providers themselves (Open-Meteo and NWS), contacted directly from your browser to fetch the
forecast for the field you choose; geolocation, if you use it, only sets coordinates locally.
See [`/privacy`](https://window.fusionspace.co/privacy).

## License

[MIT](./LICENSE). Best-effort, not authoritative — confirm conditions yourself before flying.
