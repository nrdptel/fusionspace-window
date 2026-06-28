# Window — design notes

This is my working read of how Fusion Space looks, reads, and is built, plus the plan for
Window. It's written down so it can be corrected early rather than late. It is not
user-facing.

## 1. What Fusion Space is, as a design

There are a handful of tools now — the hub (`fusionspace.co`), the HPR Motor Finder
(`motor.fusionspace.co`), Charge, and Debrief — and they're unmistakably the same hand. I
read the throughline as three habits:

- **Quiet and precise.** No marketing gloss, no gradients for their own sake, no hero
  imagery past the brand mark. Dense where the data earns it, generous with whitespace
  everywhere else. The polish is in restraint and consistency, not decoration.
- **Honest about data.** Every tool tells you where each number comes from and where it
  might be wrong — a literal "Where the numbers come from" section, best-effort
  disclaimers stated without apology, and the instinct to hide or flag a number it
  doesn't trust rather than print it clean. Transparency is part of the product, not a
  footer link.
- **Plain voice.** Direct and a little warm. Short sentences. Em dashes for asides. No
  exclamation, no hype, none of the breathless marketing-boilerplate cadence ("Let's dive
  in", "In today's fast-paced world").

### Visual system (measured from the shipped tools, not guessed)

- **Stack on screen:** Tailwind v4 with the stock palette, Geist Sans + Geist Mono.
- **Neutrals:** Tailwind `zinc`. Light `bg-white text-zinc-900`; dark `bg-zinc-950
  text-zinc-100`. Secondary `zinc-500/600` → `zinc-400`. Borders `zinc-200` / `zinc-800`.
  Subtle fills `zinc-50` / `zinc-900`.
- **Primary accent:** `indigo` (the one primary button, links, focus rings, the soft glow
  behind the hub hero). The brand mark is a violet→blue sparkle that reads on both themes.
- **Semantic colours, sparing:** emerald = good / live, amber = caution / stale /
  approximate, sky = info, red = error — always as soft tinted badges
  (`bg-emerald-500/10` with a thin matching border), never loud.
- **Type scale:** page title `text-2xl font-semibold tracking-tight`; section headers
  `text-lg`; body `text-sm`/`text-base leading-relaxed`; meta `text-xs` / `text-[11px]`.
  Numbers and codes use Geist Mono.
- **Shapes:** cards `rounded-xl border bg-white p-5 dark:bg-zinc-900/40`, hover lifts the
  border to `indigo-400`. Buttons/inputs `rounded-lg`/`rounded-md`. Pills `rounded-full`.
- **Layout:** centred column, `mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10`.
  Header is a parent-brand eyebrow + product name on the left, theme/tip on the right.
- **Theme toggle:** three-state System / Light / Dark, a small bordered button, persisted
  in `localStorage` under a per-tool key. A tiny inline script runs before paint to set
  `dark`/`light` on `<html>` so nothing flashes. `theme-color` `#ffffff` / `#09090b`.
- **Footer:** thin top border, `text-xs text-zinc-500`. A row of links separated by `·`, a
  "Built by [Fusion Space wordmark]" lockup, and a plain non-affiliation + best-effort
  disclaimer. Plus the monthly observance flourish (`lib/observances.ts`).
- **Transparency sections** are `<details>` disclosures: a `font-medium` summary, a
  `space-y-4 text-zinc-600` body, often a `<dl>` per term.

### Engineering system (inferred from the build output)

- **Next.js (App Router) statically exported** (`output: "export"`), Tailwind v4, Geist via
  `next/font`, TypeScript, Node 20. PWA manifest + service worker, full OG/Twitter meta,
  JSON-LD, SVG favicon + apple-touch-icon. Deployed to Cloudflare Pages via Wrangler in
  GitHub Actions — never Cloudflare's Git integration.
- **State lives in the URL.** Every view that matters is in the query string, so a link is
  shareable and survives reload. Per-device preferences (theme, saved things, units) live
  in `localStorage`, namespaced per tool.
- **Pure `lib/`, impure edges.** The network/file layer is kept thin; all parsing,
  normalising, and deriving lives in pure functions with colocated `.test.ts` against
  checked-in fixtures (Debrief's `lib/parsers/` + `__fixtures__/` is the model). CI never
  touches the network.
- **No per-visitor server work.** The math tools are pure client-side; the Motor Finder
  ships a static snapshot and filters in the browser. That hard line keeps everything on
  Pages' free tier.

## 2. What Window is, as a product

A weather board for US high-power and model rocketry. You give it a launch field; it shows
the weather a flyer actually needs to decide whether to fly — surface wind against the
safety limit, winds aloft up to waiver altitude, cloud ceiling, precip, and a multi-day
outlook — in one glanceable, honest view.

It is **purely informational.** It takes no rocket parameters and produces no go/no-go
verdict. Every competing tool leans on an unvalidated weathercock/drift model; Window
deliberately has none. It surfaces the data and the relevant reference lines and lets the
flyer decide. The value is honest aggregation and clear presentation — which is exactly the
family's posture, just pointed at live weather instead of a stored snapshot.

This is the first sibling that fetches **live third-party data from the browser** rather
than from a baked snapshot. That's still "no per-visitor server work": the providers
(Open-Meteo, NWS) do the serving; we host static files only. No backend, no API keys, no
Functions.

US-first, imperial defaults (mph, ft, °F), with a units toggle.

### Information architecture (how the page is organised)

The page reads top-to-bottom as the order a flyer's eye actually wants on a launch morning:
is it safe at the pad right now, when's the calm window, what happens to my rocket up high,
will I see it, and is the drive even worth it.

1. **Location bar** (`#location`) — coordinates, place search, or "use my location". The one
   control that changes everything below it. Lat/long is written to the URL so the whole
   view is a shareable, reload-proof link.
2. **Active alerts** (`#alerts`) — any NWS watch/warning/advisory for the field, shown only
   when present. First because a Red Flag or Wind Advisory reframes everything under it.
   Degrades to nothing (not an error) when NWS is unreachable.
3. **Right now** (`#now`) — surface wind + gust + direction against the **20 mph** surface
   limit reference line, temperature, sky, precip. Each figure carries its own freshness
   time and source. This is the "can I even set up" glance.
4. **Today & tomorrow** (`#hourly`) — an hourly wind timeline so the flyer can find the calm
   window in the day, with gust band and the 20 mph line drawn through it.
5. **Winds aloft** (`#aloft`) — the signature panel: wind speed + direction vs altitude AGL,
   surface up to waiver altitudes. The thing general weather apps bury or cap low.
6. **Sky & ceiling** (`#sky`) — current ceiling/coverage from the nearest reporting station
   (observed), plus the multi-day cloud picture (modeled). Labelled clearly which is which.
7. **The next several days** (`#outlook`) — a ~7-day outlook: the "is the drive worth it"
   row.
8. **How this is derived** (`#sources`) — a `<details`-style explainer documenting source,
   model, valid time, and limits for every figure. Same transparency habit as the siblings.
9. Footer with attributions + disclaimers.

A collapsed **"How to read this"** intro sits near the top (native `<details>`, no client
JS), the family's standard newcomer affordance.

### The 20 mph line is a reference, never a verdict

NFPA 1127 / NAR / Tripoli put the surface-wind ceiling for launching at **20 mph**. Window
draws that as a reference line on the current wind and the hourly timeline, and colours the
current reading amber as it approaches and red past it — but it never says "no-go". It's the
published limit drawn where you can see it against the actual number; the decision stays
with the flyer, who also has to weigh their own field's rules, their rocket, and their
nerve. A personal, lower line (some clubs and flyers fly to 15, or to their own comfort) is
an optional override stored locally.

### Wind direction convention, stated out loud

All wind directions are the **direction the wind blows _from_**, meteorological convention —
a "270° / W" wind comes _out of_ the west. It's stated on the current panel and in the
explainer, because a flyer reading drift wants no ambiguity about which way "west wind"
points.

### The winds-aloft profile (the signature panel)

This is the panel general weather apps don't have, and the reason Window exists. A flyer
cares what the wind does between the pad and apogee — it's what weathercocks the rocket off
the rail and walks the recovery downrange — and waivers routinely go to 10–25k ft, well past
where consumer apps stop.

- **Form:** a vertical profile. Altitude AGL runs up the y-axis (the way you'd picture the
  column of air over the field); wind speed runs along the x-axis as a horizontal bar per
  level, with a small arrow at each level pointing the way the wind blows _toward_ (the
  drift direction), annotated with the from-direction and speed. A vertical profile reads
  more naturally than speed-vs-time here because altitude is the independent variable the
  flyer is reasoning about.
- **True AGL.** Each pressure level (1000→250 hPa) maps to a real height via its
  geopotential height minus the field's ground elevation. Open-Meteo reports `elevation` in
  metres always; the geopotential height's unit varies, so the parser reads the reported
  unit and normalises everything to feet before subtracting. Levels below the field
  (negative AGL) are dropped.
- **Top altitude** defaults to **20,000 ft AGL** (covers most HPR waivers) with quick
  presets (10k / 20k / 30k / all data). Levels are sparse high up, so the profile draws the
  points it has and interpolates nothing it doesn't.
- **Time.** The profile shows a single valid hour, tied to the hourly-timeline selection, so
  scrubbing the day re-draws the column. Defaults to the current/next hour.
- **Accessible fallback.** The profile is an SVG with `role="img"` and a full text
  alternative, and it's mirrored by a real `<table>` (altitude, speed, gust-equivalent,
  from-direction) so the axe pass stays clean and a screen reader gets the numbers, not a
  picture.

### Charts: lightweight SVG, no chart library

Debrief reaches for uPlot because a flight log is thousands of samples on a canvas. Window's
data is tiny — ~48 hourly points and a dozen-odd aloft levels — so a small bespoke SVG
component is the cleaner choice: it themes by `currentColor`, needs no dark-mode reinit, has
no CSS to import, and gets a `<table>` fallback for free. Two of them — an hourly wind
timeline and the vertical aloft profile — both pure render functions over already-parsed
view-model arrays. Keeping the dependency list identical to Charge's is itself on-brand.

### Live data, last-known offline

Unlike the math/file siblings, Window's value _is_ live data, which can't be produced
without signal. So the offline story is different and stated honestly:

- Every successful fetch is cached per field (keyed by rounded lat/long) in `localStorage`.
- When offline, or when a fetch fails, Window shows that **last-known** data with a prominent
  "as of <time>" staleness flag — never an error in place of data, and never a stale reading
  dressed as fresh.
- The service worker caches the **shell** for instant load and installability only. It must
  not imply that live data works offline; the staleness flag is what tells the truth.

### Data layer (US only, free, keyless, CORS-friendly)

- **Open-Meteo Forecast API** is the backbone and the one hard dependency — if it's down,
  the board is down, and we say so. One request pulls current + hourly + daily surface
  variables (wind / gust / direction, temperature, precip + probability, cloud cover) _and_
  pressure-level winds + geopotential heights for the aloft profile. `gfs_seamless` gives a
  US-optimised GFS/HRRR blend; imperial units requested. The response `elevation` is the
  field ground level for the AGL conversion.
- **Open-Meteo Geocoding API** — place search.
- **NWS `api.weather.gov`** — a graceful-degradation _enhancement_, not a dependency. Two
  uses: active alerts for the field (`/alerts/active?point=`), and the nearest reporting
  station's current ceiling / cloud layers (`/points` → station list → `/observations/
  latest`, ceiling = lowest BKN/OVC base). If NWS is unreachable we hide alerts and fall
  back to Open-Meteo cloud-cover for the sky panel; the board still works. **Gotcha:** NWS
  is fetched as a plain GET with no custom `User-Agent` header — setting one trips its CORS
  preflight in the browser.
- **Nearest-station logic.** NWS returns stations roughly by proximity, but the closest is
  often a RAWS/automated site that reports no cloud layers. So Window walks the first handful
  and picks the first whose latest observation actually carries `cloudLayers` (i.e. a METAR
  station), and labels the station and its distance.
- **Winds aloft is Open-Meteo only.** NOAA removed the rucsoundings/RAP upper-air feed for
  the continental US, so there is no better free source.

All parsing — Open-Meteo → view model, METAR `cloudLayers` → ceiling, pressure levels → AGL
profile, WMO weather codes → sky text, unit conversions, alert normalising — lives in pure
`lib/weather/*` with colocated tests against checked-in fixtures derived from real responses.
The network functions (`lib/weather/net.ts`) are thin and impure and never appear in a test.

### Caching / politeness

One forecast request per field, plus up to one geocode and a small bounded walk of NWS
endpoints. Results are cached in `localStorage` with a short freshness TTL (~10 min) so a
reload or a units toggle doesn't refetch, and a longer last-known retention so an offline
visit still shows something. Switching units never hits the network — units are a display
transform over the stored view model.

### Storm potential / CAPE (post-v1)

The board covered wind, sky, ceiling, alerts, and density altitude, but said nothing about
*convective instability* — and afternoon thunderstorms cancel more summer launches than wind
does. A clear morning can tower up into a Red Flag by 3 PM, so a flyer planning the drive
wants to know whether the air is primed to blow up. Open-Meteo exposes **CAPE** (convective
available potential energy, J/kg), the standard measure, so Window surfaces it: a pure, tested
classifier (`lib/weather/instability.ts`) sorts the current value and the day's peak into the
usual SPC-style bands (under 300 stable, to 1000 marginal, to 2500 moderate, above strong),
and the panel headlines the worse of now and the afternoon peak with a plain-language note.
It's its own glanceable panel between "Right now" and the hourly timeline, and it pairs with
the NWS alerts (which carry any actual watch or warning). Same posture: a real meteorological
figure, surfaced with context, never a go/no-go. One more field on the existing request
(`cape`), no new dependency.

### Wind shear (post-v1)

The signature panel is winds aloft, and the thing a flyer reads a sounding *for* is shear — a
sharp change in wind between two layers, which tips a rocket off its heading off the rail and
walks the recovery downrange. So the profile now flags its strongest shear layer. A pure,
tested helper (`lib/weather/shear.ts`) takes the plotted levels (surface included), encodes
each as a velocity vector in the meteorological FROM convention, and reports the adjacent
pair with the greatest vector difference — a single number that captures speed change, a
directional veer, or both. It renders as a small amber-tagged callout under the profile
("Strongest layer 6,900 → 10,800 ft — +9 mph and veers 18°"), with a one-line, factual note
about why it matters. Same posture: it points the layer out, it doesn't decide. It
strengthens exactly the panel that makes Window worth opening, at no new dependency or
request.

### Field briefing (post-v1)

The family ships text/share exports everywhere — Charge's copy-as-text card, Debrief's
share link — and a flyer's real habit before a launch is to post the conditions to the club
chat. So "Copy briefing" assembles a plain-text summary of the field (surface wind vs the
limit, sky and ceiling, density altitude, a few winds-aloft levels, any alerts, the next
calm window, a short outlook) with the share link and the not-authoritative disclaimer baked
in — exactly the figures on the page, so a pasted briefing carries the same honesty. The
generator (`lib/weather/briefing.ts`) is pure and tested; the share URL is passed in so it
stays free of browser globals. The strip also offers "Copy link" (the exact view) and, where
the browser supports it, native "Share". Nothing is uploaded — the text is built in the
browser and put on the clipboard. A `<details>` preview shows (and lets you select) the text
for browsers where the clipboard is blocked.

### Density altitude (post-v1)

The honest "how thin is the air" number, and one the v1 brief flagged for later. A pure
helper (`lib/weather/density.ts`, tested) takes the field's actual station pressure,
temperature, and humidity, computes the moist-air density (dry + water-vapour partial
pressures over their gas constants), and inverts the ISA density profile to the altitude
where standard air has that density. It needed exactly one new field on the existing
forecast request — `surface_pressure` — and no new dependency. It sits under "Right now" as
a slim card showing the value, how far it stands above (or below) the field's ground
elevation, and a one-line, factual note when the air is notably thin (less thrust, faster
descent, higher out-of-sight flights). Field elevation is shown for context only — it is
*not* an input to DA, a common misconception the explainer calls out. Same posture as the
rest of the board: a real meteorological figure with its formula shown, never a verdict.
It's the most useful at exactly the fields where it bites — high-desert and hot-day
launches.

### Calm windows & daylight (post-v1)

The single question every flyer asks is "when's the wind going to lay down so I can fly?"
— and the hourly forecast already answers it, so Window surfaces it directly. A pure
analyzer (`lib/weather/windows.ts`, tested) scans forward from the current hour and returns
the upcoming stretches where the *sustained* wind stays at or below the active line (the
20 mph reference, or a lower personal one), each annotated with its peak wind/gust and how
much of it falls in daylight. They render as tappable chips above the hourly chart;
tapping one drops the winds-aloft profile onto that hour, the same selection the slider
drives. It's the same honest posture as the rest of the board — it highlights low-wind
daylight stretches against a line *you* chose, it doesn't tell you to fly — just made
literal for the decision flyers actually make. Daylight comes from Open-Meteo's hourly
`is_day` flag; the multi-day outlook also gained sunrise/sunset, because losing light
mid-recovery is a real way to lose a rocket. Both are cheap reads on data already fetched,
so they cost no new dependency and no extra request.

### Units

Imperial by default: wind **mph**, altitude/height **ft**, temperature **°F**, precip
**in**. The toggle offers metric (km/h, m, °C, mm) and, because aviation and many flyers
think in them, **knots** for wind. The view model is stored in the units the API returns
(imperial); the toggle is a pure conversion at display time. Direction is always degrees +
a 16-point compass label.

### State & sharing

Lat/long (and a human label when we have one) live in the URL query string — the family's
URL-as-state convention — so any view is a shareable, reload-proof link. Units, the personal
wind line, saved fields, and theme live in `localStorage` under a `window.*` namespace.
Geolocation, when used, only sets the coordinates locally; it's never sent anywhere but
Open-Meteo/NWS as the lat/long of the forecast request.

### Privacy, stated truthfully for a live-fetch tool

The family's "private by default" posture holds — no accounts, no analytics, no tracking of
any kind — but Window says it accurately: the only third parties are the weather providers
themselves (Open-Meteo and NWS), contacted directly from your browser to fetch the forecast
for the field you choose. Geolocation, if you use it, only sets coordinates locally. A short
`/privacy` page spells this out.

## 3. Technical plan

- **Match the family's stack exactly.** Next.js App Router + `output: "export"`, Tailwind
  v4, Geist, TypeScript, Node 20 — reusing the siblings' `next.config`, `tsconfig`,
  `eslint.config`, `postcss.config`, `wrangler.toml`, `_headers`, `.gitignore`, `.env.example`
  (names/origin adapted only). Static-exports to `out/`, no runtime server.
- **One page.** `/` is the board; `/privacy` is the only other route. The explainer lives
  inline in disclosures.
- **Shared chrome verbatim** (strings adapted): header/footer, the Fusion Space badge, the
  Ko-fi tip _link_, the three-state theme toggle + pre-paint script, `globals.css` tokens,
  the brand vectors, the OG template + `gen-og.mjs` + `og-mark`, `lib/observances.ts` + the
  monthly rebuild, PWA manifest + service worker, robots/sitemap, issue templates,
  CONTRIBUTING / SECURITY / LICENSE (MIT). `NEXT_PUBLIC_SITE_URL` defaults to
  `https://window.fusionspace.co`, fork-overridable.
- **Deploy** via GitHub Actions → Cloudflare Pages, mirroring the siblings'
  `deploy-cloudflare.yml` (`cloudflare/wrangler-action`, `pages deploy out
  --project-name=fusionspace-window --branch=main`, push-to-`main` + `workflow_dispatch` +
  the monthly observances cron, `concurrency`, least-privilege `permissions`). `test.yml`
  carried over (lint, unit, build, Playwright e2e + axe). No `@cloudflare/next-on-pages`.
- **Tests are deterministic and never hit the live APIs.** Unit tests run pure `lib/`
  against fixtures derived from real Open-Meteo/NWS responses; e2e intercepts every
  `api.open-meteo.com` / `api.weather.gov` route with Playwright and serves the same
  fixtures — the way the Motor Finder keeps CI deterministic with a tracked snapshot.

### Decisions (resolved)

- **Scope of v1:** location (coords / search / geolocation, no curated directory); alerts;
  current conditions vs the 20 mph line; hourly timeline; winds-aloft AGL profile;
  ceiling/sky (observed + modeled); 7-day outlook; the derivation explainer; units toggle
  incl. knots; personal wind line; saved fields; last-known offline.
- **Winds-aloft viz:** vertical AGL profile, default top 20k ft, presets to 30k/all,
  SVG + table fallback, time tied to the hourly selection.
- **Charts:** bespoke SVG, no chart library (data is small; keeps deps identical to Charge).
- **Pressure levels requested:** 1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400,
  300, 250 hPa — dense low where recovery cares, coarse high; whatever returns non-null is
  plotted.
- **NWS is optional.** Hard-fail only on Open-Meteo. Alerts and observed ceiling degrade
  silently to a modeled sky picture.
- **Repo / license / deploy:** `nrdptel/fusionspace-window`, MIT, Wrangler-in-Actions,
  production branch `main`, monthly rebuild for the observance rollover.

### Deferred to v2 (clean seams left)

- Forecast ceiling in feet (TAF) — `aviationweather.gov` has no CORS, so it needs a
  proxy/Function, which breaks the free-static line. The multi-day sky picture rides on
  cloud-cover % until then; the sky panel is structured so a TAF ceiling slots in beside the
  observed one.
- Density altitude, a curated launch-site directory, expanded alert handling. The location
  bar and outlook are written so a site directory and a DA read-out drop in without rework.

### The one thing worth a second eye

The 20 mph surface limit is the published NFPA/NAR/Tripoli number and is drawn as a
reference, not a rule — but it's the one place Window comes closest to looking like advice.
The deliberate stance is to draw the line and the number and stop there: no verdict, no
proprietary drift model, the decision left with the flyer. That restraint is the whole
reason this tool can be honest where the others can't.
