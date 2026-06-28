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

- **Right now** — surface wind, gust, and direction against the 20 mph launch limit, with the
  model figure cross-checked against the nearest station's *observed* wind; plus temperature,
  sky, **density altitude** (how thin the air is, which sets thrust and descent), and a
  **pressure tendency** so you can see the barometer rising or falling. Winds are named for the
  direction they blow *from*.
- **Storm potential** — convective instability (CAPE), now and the day's peak, sorted into the
  bands meteorologists use — so a calm morning that towers up by mid-afternoon doesn't catch
  you out.
- **Today & tomorrow** — an hourly wind timeline with the upcoming **calm windows** surfaced
  above it. Drag the **fly-time** slider (or tap a window) to any hour and a snapshot shows that
  hour's wind, density altitude, and storm potential — and the winds-aloft profile follows it.
- **Winds aloft** — the signature panel: wind speed and direction by true height above the
  field, surface up to waiver altitudes, mapped from pressure-level geopotential heights. It
  flags the strongest **shear** layer, the column's **mean wind** (which way recovery drifts),
  and the **0°C** level. The thing general weather apps bury or cap low.
- **Sky & ceiling** — the observed ceiling and **visibility** from the nearest reporting station
  where there is one (labelled *observed*, with the raw METAR a click away), with a modelled
  multi-day cloud picture beside it.
- **Active alerts** — NWS watches, warnings, and advisories for the field.
- **The next several days** — a ~7-day outlook with sunrise/sunset: the "is the drive worth it"
  view.
- **Field briefing** — "Copy briefing" assembles a plain-text summary of the conditions for the
  club chat; "Copy link" shares the exact view.
- **How this is derived** — source, model, valid time, and limits for every figure.

US-first, imperial defaults (mph, ft, °F) with a units toggle (metric, and knots for wind).
The field rides in the URL, so any view is a shareable, reload-proof link; units, saved
fields, and your personal wind line stay in your browser.

## The data

All fetched client-side, in your browser, from free, keyless, CORS-friendly public APIs —
there is no backend.

- **[Open-Meteo](https://open-meteo.com)** Forecast API — the backbone, and the one hard
  dependency: current, hourly, and daily surface variables plus pressure-level winds for the
  aloft profile, in a single request using a US-optimised GFS/HRRR blend (`gfs_seamless`). Its
  Geocoding API powers place search. (CC BY 4.0.)
- **[NOAA / National Weather Service](https://www.weather.gov)** — active alerts and the
  nearest station's latest observation (a METAR): the observed ceiling, visibility, and surface
  wind, plus the raw report. A graceful-degradation enhancement, not a dependency: if it can't be
  reached, alerts are absent, the observed cross-checks drop out, and the sky falls back to
  modelled cloud cover and visibility.

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
Git integration). A monthly cron rebuilds so the awareness-month observance rolls over with the
calendar. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repo secrets;
`NEXT_PUBLIC_SITE_URL` defaults to the production origin and is fork-overridable.

## Privacy

No accounts, no analytics, no tracking of any kind. The only third parties are the weather
providers themselves (Open-Meteo and NWS), contacted directly from your browser to fetch the
forecast for the field you choose; geolocation, if you use it, only sets coordinates locally.
See [`/privacy`](https://window.fusionspace.co/privacy).

## License

[MIT](./LICENSE). Best-effort, not authoritative — confirm conditions yourself before flying.
