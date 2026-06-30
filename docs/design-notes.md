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

### Fly-time snapshot (post-v1)

The board reads "what's it like now," but the decision a flyer is making is "what will it be
like when I drive out this afternoon." The winds-aloft profile already time-travelled with the
hourly slider, so this extends that into a proper launch-time planner: the slider is relabelled
"fly time," and scrubbing it to any hour shows a compact snapshot of that hour's decision
figures — surface wind against the 20 mph line (toned), gust and direction, temperature,
density altitude, and storm potential (CAPE band) — right above the aloft profile, which
follows the same selection. It's a thin, pure composition (`lib/weather/snapshot.ts`, tested)
of figures the board already derives — density altitude and the CAPE classifier — over the
hourly point, so it needed three more fields on the existing request (hourly humidity, station
pressure for per-hour density altitude; CAPE was already hourly) and no new dependency. Same
posture: it surfaces the hour's numbers against the reference, never a go/no-go.

### Iconography — monochrome SVG, no emoji (post-v1)

Every glyph on the board is a line-style, monochrome SVG that inherits `currentColor` — the
weather icons (`components/WeatherIcon`, keyed off the WMO code in `lib/weather/wmo.ts`), the
sun/moon used for daylight and the theme toggle, the warning triangle on the safety note and
alerts, the save-field star, and the footer's observance lines (now text only). No emoji
anywhere. Emoji render inconsistently across platforms and read as decoration, which is
exactly what this family's restraint avoids; a coherent SVG set sits better in the quiet,
precise look and themes cleanly in light and dark.

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

### Freezing level (post-v1)

The winds-aloft panel is built on an altitude axis, which makes it the natural home for one
more atmospheric figure a high-altitude flyer wants: the **0°C level**. A flight that punches
well past it climbs into genuine cold, which is worth knowing for altimeter batteries and
recovery electronics. Open-Meteo reports `freezing_level_height` (in feet under the imperial request, as the
visibility/geopotential fields are), so one more hourly variable on the existing request,
expressed as height above the field in `forecast.ts`, gives `AloftProfile.freezingLevelAglFt`.
The chart draws it as a blue dashed reference line with a `0°C` tag and its height, but only
when it falls inside the shown column, so the Top selector and the fly-time hour both move it
naturally. It's the same posture as the 20 mph and shear callouts: a labelled line, never a
verdict. No new request, no dependency.

A second real-data validation pass — high-latitude and Southern-Hemisphere-winter fields
(the Alaska Range at 18,500 ft and −6 °F, Patagonia, the Bolivian Altiplano) — exposed that
the *absence* of the line was ambiguous. It can mean two opposite things: the 0°C level is
**below the field** (sub-freezing from the surface up, the Alaska case — important for cold
electronics), or it's **above the shown column** (warmer than freezing throughout the view).
The original parser collapsed below-field *and* model-absent both to `NaN`, so the component
couldn't tell them apart. `freezingLevelAglFt` is now kept **signed** — negative when the
level sits below the field — with `NaN` reserved strictly for a model gap. The chart still
draws the line only for a positive in-range height, but now captions the blank when there is
one: "0°C is below the field — sub-freezing from the surface up," or "0°C is above the shown
column — the air in view stays above freezing." The same honest no-ambiguous-blank habit the
rest of the board follows. (The pass otherwise confirmed robustness: below/at/above-field
freezing levels, extreme-altitude fields dropping their below-ground pressure levels, strong
winter jets aloft, and the global NWS degradation all parsed correctly with no other change.)

### Mean wind & drift (post-v1)

Shear answers "what knocks it off heading"; the other question every flyer asks of a sounding
is "which way does it walk on the way down." The classic answer is the **mean wind** (the
"ballistic wind"): the single vector that, blowing uniformly through the column, produces the
same net drift as the real profile. So the winds-aloft panel now reports it. A pure, tested
helper (`lib/weather/drift.ts`) takes the plotted levels, turns each wind into a velocity
vector (FROM convention), and averages them weighted by the thickness of the altitude band
each level represents — trapezoidal over height, so a deep steady layer outweighs a thin
jutting one and opposing winds genuinely cancel (a column that veers around the compass has a
smaller mean than its scalar average — the honest behaviour). It renders as an indigo-tagged
callout beside the shear one ("Mean wind to 20,000 ft 14 mph from WSW — recovery tends to walk
ENE") and is named for the direction the rocket drifts *toward*, the opposite of the wind's
source. It honours the Top selector, so you can read the mean to 10k or the whole column, and
it rides along into the field briefing. Deliberately it takes no rocket parameter and no
descent rate — it leans the drift, it doesn't predict a landing — keeping Window's
informational, no-verdict posture. No new dependency or request; it's geometry over levels the
board already plots.

The drift callout originally gave only the *direction*, which left half the recovery question —
*how far?* — unanswered. The honest completion (post-v1) is a **rate**, not a distance: the mean
wind is itself a speed, so `driftFtPerMin` (tested, just mph × 5280/60 = ×88) reframes it as how
far downrange recovery walks for each minute aloft, and the flyer multiplies by their own time
under chute. That's the trick that keeps it within the no-verdict line — it takes no descent rate
and no rocket parameter, predicts no landing point, and simply gives the *scale* the existing
direction was missing. It shows in the Drift callout ("…about 2,900 ft downrange per minute
aloft") and the briefing, both in the active length unit.

### Visibility (post-v1)

The Sky panel showed the ceiling but not visibility, which is the other half of a flyer's
sky read: you have to keep a high flight in sight to track and recover it, and many waivers
carry explicit cloud-and-visibility minimums. So visibility now sits beside the ceiling, on
the same observed/modelled footing. The METAR already fetched for the ceiling also carries
visibility (in metres), so the observed value is free — parsed to statute miles in
`metar.ts` and tagged *observed*. When no station is reachable it falls back to Open-Meteo's
modelled visibility for the current hour (one more hourly variable on the existing request,
converted from metres via the reported unit in `forecast.ts`), tagged *modelled* — the same
graceful-degradation pattern as the cloud picture. It's stored canonically in statute miles
and shows miles imperial, kilometres metric (a third length idiom alongside altitude-feet and
the wind units, so it gets its own `VIS_LABEL`/`fmtVisibility`). Observed values top out near
the METAR's 10-mile reporting ceiling while the model reads higher in clear air — a small
honest discontinuity the source labels make legible. It rides into the field briefing too.

### Air quality & wildfire smoke (post-v1)

Visibility from the METAR is the *observed* clarity, but it tops out at ten miles and says
nothing about *why* the air is hazy. In the western US — Black Rock, Lucerne, most of the high
desert where this hobby lives — that "why" is increasingly wildfire smoke, and a smoked-out field
is a real reason a launch gets scrubbed (you can't track what you can't see, and it's a health
call at the pad). So the board now carries air quality as its own best-effort read: the US AQI
plus PM2.5 (the smoke proxy) and PM10 (dust), from Open-Meteo's free, keyless Air-Quality API
(CAMS). It's the fourth provider call and the third *best-effort* one — the same posture as NWS
and the seasonal normal: a parallel fetch in `loadBoard`, a pure tested parser/classifier
(`airquality.ts`, banding the AQI into the six EPA categories over the board's three tones), and
on any failure it returns null so the panel is simply absent and the forecast — the only hard
dependency — is untouched. It renders as its own panel below the sky (only when the lookup landed)
and rides into the briefing when it's worse than Good. The framing is deliberately rocketry-first:
the health scale is the headline, but the blurb leads with what it means for *tracking* a flight,
because that's the part a general AQI widget never tells a flyer. A figure on a standard scale,
never a verdict.

### Methodology, collapsed (post-v1)

"How this is derived" had grown — every feature added its own honest write-up — into a long
wall of always-open paragraphs at the foot of the page. The fix matches the sibling tools
(Charge's "Where the numbers come from", the Motor Finder): the deep explanations belong one
click away, not in your face. The eighteen entries are now grouped into eight collapsed
`<details>` disclosures (Surface conditions; The 20 mph line; Winds aloft; Sky; Storm potential
& alerts; Planning ahead; The field briefing; Freshness & offline), styled exactly like the
"How to read this" box at the top. The content is unchanged — same careful, sourced prose — but
the default page is clean, and a curious flyer opens only the section they care about. The
restraint the family is known for, applied to its own documentation.

### Fixture fidelity — feet, not metres (post-v1)

Validating the parsers against a real Open-Meteo response (Black Rock Desert, a high desert
field very unlike the synthetic fixture) turned up a quiet test-fidelity gap: when the request
asks for imperial wind/temperature — which the app does — Open-Meteo returns the *length*
variables (geopotential height, visibility, freezing level) in **feet**, not the SI metres. The
parsers were already correct (they read each variable's reported unit rather than assume one),
so production was fine; but the fixture had been written in metres, so the whole suite only ever
exercised the metres path while production ran the feet path. A regression in the feet handling
would have shipped green. The fixture now mirrors real behaviour (feet), the derived
miles/AGL values are identical, and `visibilityToMiles`/`heightToFeet` are unit-tested both ways
so neither path can rot. The lesson the family already lives by — read the unit, never assume —
now has the test coverage to match.

### Raw-METAR sky fallback (post-v1)

A second pass of the same real-data validation — running the live NWS parser against a spread
of fields (coastal Florida, the Kansas plains, a no-coverage point in Canada) — turned up a
quiet but consequential gap. The sky panel reads the *structured* `cloudLayers` array NWS
returns, and treats an empty array as "this station has nothing to say about the sky," skipping
it for the next one out. But the NWS API returns `cloudLayers: []` on a surprising number of
observations whose *raw METAR clearly reports the sky* — a bare `CLR`, or even a layer like
`SCT030` or `BKN015`. At Bunnell, FL the nearest station (KFIN, 3 miles out) was reporting
`...10SM CLR...` and getting skipped, so the board pulled its ceiling, visibility, *and* the
observed-wind cross-check from a station 23 miles away — on exactly the clear day someone would
be flying. So when `cloudLayers` is empty and a raw METAR is present, the parser now falls back
to reading the METAR sky group itself (`parseMetarSky`, pure and tested): clear tokens
(`CLR`/`SKC`/`NSC`/`NCD`/`CAVOK`) mark a usable clear sky with no ceiling, and `FEW`/`SCT`/`BKN`/
`OVC`/`VV` groups become layers at their hundreds-of-feet AGL heights — which also recovers a
genuine `BKN`/`OVC` ceiling the structured field had dropped. The scoping is careful: a station
that issues no METAR at all (a true no-sky RAWS like Black Rock's BLUN2) and a sky-less AUTO
report (wind and temperature, cloud sensor out — verified against a real `$`-flagged KP28
observation) both still read unusable, so the degradation that PR #26 locked down is untouched.
The structured array stays primary when it's populated; the fallback only fills the gap the API
leaves. The upshot: on the clear days people actually fly, the *nearest* station's reading is
used, not one tens of miles away.

### Adversarial edge validation (post-v1)

The first two real-data passes each found a bug (the CLR sky discard; the 0°C below/absent
ambiguity); a third pass went looking specifically at the *geographic* edges most likely to break
the parsers — below-sea-level fields (Death Valley −279 ft, the Salton Sea −236 ft), open ocean
(a Gulf point at 0 ft elevation with no NWS stations), inland water (mid-Lake Michigan), and a
barrier island — plus another hunt for a live m/s wind station. This time nothing broke: negative
elevation keeps every pressure level (they're all above a sub-sea-level field) with sound AGL and
freezing-level math; an ocean point parses fully, gets CAMS air quality, and degrades cleanly to a
modeled sky when NWS returns no stations; a station feeding *no* wind at all (Lake Michigan's K8D4)
reads `NaN`/unusable rather than crashing; and the conditions grid never threw. The one actionable
output was test-hardening, the standing pattern for these passes: the *below-sea-level* path was
real but untested, so it's now a `forecast.ts` regression case (negative elevation drops no levels;
AGL and the 0°C line measure up from the negative datum). The m/s hunt came up empty again — every
NWS land station reports km/h, so that defensive `windToMph` branch can't be exercised against the
app's real source; it stays as cheap, unit-tested insurance. A pass that confirms robustness rather
than fixing a bug is still worth running for a safety-adjacent tool — and it leaves a guard behind.

### Health sweep — deps, security, a11y depth (post-v1)

A maintenance pass rather than a feature. `npm audit` flagged three moderate advisories, all from
one transitive `postcss <8.5.10` (an XSS in CSS *stringify* — a build-time path, not exploitable in
a pre-built static export, but it shows up in any scan). The naive `audit fix --force` wanted to
*downgrade Next to 9.x*, which is absurd; the clean fix is a single `overrides: { postcss:
"^8.5.10" }` that forces the patched line (8.5.16) across the tree without touching the exact-pinned
Next/React — audit goes to zero, build and tests stay green. Performance needed nothing: 1.7 MB of
static output, the largest chunk ~70 KB gzipped, self-hosted Geist, SVG-only icons. The a11y axe
suite was the interesting part: it only ever audited the *default* render, so it was extended to the
**expanded** states behind a toggle (every disclosure opened, the chart table fallbacks, the
popular-sites picker, the briefing preview) — and that immediately caught two real issues hidden in
those states: toned status text (`amber-700`, `red-600`) failing contrast on the indigo *selected-row*
tint in the table fallbacks, and the scrollable `max-h-72` table wrappers not being keyboard-focusable.
Both fixed (lighter selected-row tint + weight so every tone clears 4.5:1; `tabIndex` on the scroll
regions), and the expanded-state audit now runs in CI in both themes so those states can't regress.
The lesson mirrors the data passes: audit the states users actually reach, not just the one that
renders first.

### Ceiling vs your apogee — a go/no-go gate (post-v1)

The board already parsed the observed cloud **ceiling** out of the nearest METAR (lowest BKN/OVC
base, in feet) and printed it — but it was the one figure on the whole board with *no
interpretation*. Every other number gets toned against a reference: wind against the 20 mph line,
gusts against their spread, storms by CAPE band, drift against a distance. The ceiling was a bare
number. And for rocketry it's not a comfort metric, it's a **hard go/no-go gate**: FAR 101 waivers
and the NAR/Tripoli safety codes forbid flying into or through cloud, so a flight whose predicted
apogee reaches the deck simply can't go up, however calm the wind. General weather apps never frame
the ceiling this way because they don't know you're about to put something *through* it.

So the flyer sets an **expected apogee** (a new optional field beside the personal wind line, kept
in feet because that's how US waivers and altimeters talk — `lib/prefs.ts`, capped at 100,000 ft),
and `lib/weather/ceiling.ts` reads the ceiling against it: comfortably below → *Clear*, within a
buffer → *Tight*, at or above → *No-go*. The buffer is the larger of 500 ft or **15% of the
apogee** — a predicted peak carries real error (motor impulse, liftoff mass, drag all move it), so a
flight that only just sneaks under the deck isn't a confident clearance; the percentage scales that
honestly with altitude. A clear sky (no BKN/OVC) is the absence of a ceiling, so the caller owns it
as an unlimited margin rather than feeding it through the comparison. The read lands in the sky
panel and the text briefing, both gated on the apogee being set so the default board is unchanged.
It fits the house style exactly: draw the line, state the margin, leave the call to the flyer.

### Low-cloud outlook — the forecast companion to the ceiling (post-v1)

The ceiling-clearance read was honest but **now-only**: it reads the observed METAR ceiling, which
can't tell a flyer that low cloud is forecast to build tomorrow afternoon — exactly the thing
you'd want to know *before* driving two hours to a field. Open-Meteo forecasts `cloud_cover_low`
hourly (free, already on the same call), so the natural other half is a forward read of that
series across the planning window. `lib/weather/lowcloud.ts` bands a cover figure thin / broken /
overcast (the okta convention a METAR uses to *call* a ceiling — broken at ~5–7 oktas is where a
layer starts being one) and summarises a window into a headline: "Thin now, building to overcast
(85%) by Tomorrow 12 PM", or "Overcast now, thinning to 20% by …", or "stays thin". Low cloud
specifically, not total cloud — high cirrus doesn't form a launch-blocking ceiling, so folding it
in would cry wolf. The honest seam is the important part: this is cover **%**, not a forecast
ceiling *height*, so it can't be a go/no-go the way the observed ceiling-vs-apogee read is. It's
deliberately softer — labelled *modelled*, framed as a heads-up, with the observed ceiling keeping
the actual call. A compact per-hour strip (bar height = cover, colour = band) sits under the
headline; the SVG carries the headline as its `aria-label` and the bars carry per-hour `<title>`s.
The forecast ceiling in feet (TAF) is still the deferred-to-v2 item that would make this a true
forward go/no-go; until a proxy exists for that CORS-less source, the low-cloud band is the honest
best-effort stand-in.

### Validation pass #4 — the two sky features vs live data (post-v1)

The same throwaway-spec discipline as the earlier passes, aimed at the new sky code: pull *real*
Open-Meteo and NWS responses and run them through the actual parsers, not a fixture. Two things
checked. (1) `cloud_cover_low` is genuinely returned by Open-Meteo — integer %, 0–100, no nulls,
length-matched to `time` — so the parse and `lowCloudOutlook` assumptions hold; the live Black Rock
series even carried an isolated 100% hour the bands read correctly. (2) `parseObservation` →
`ceilingRead` against eight real stations spanning the sky: KAST (BKN@1700 / BKN@2600 / OVC@3700 →
ceiling = the *lowest* BKN, 1700 ft), KSEA (OVC@2600), KKLS (FEW@2400 below a 3000 ft apogee + an
OVC@3700 deck → reads **Clear**, because FEW/SCT below the apogee isn't a ceiling — exactly the
rocketry semantics intended), KKIC (nothing → skipped). **No bug** — like the adversarial-edge pass,
the value was the confirmation.

The one durable, non-obvious shape it surfaced: real automated stations (KORD, KDAG, live) send a
*structured* `cloudLayers` entry of **`CLR` with a base value** — clear-below the sensor's ~12,000 ft
ceiling. The parser already ignores it (CLR isn't a ceiling amount), but nothing locked that exact
shape, so a peak above 12,000 ft could in principle have read as flying into a phantom 12,500 ft
"deck". A regression test now pins it: a structured CLR-with-base stays a null ceiling. A second
real find worth noting in passing — `rawMessage` came back empty on every station sampled, so the
structured path carries the load and the raw-METAR recovery only fires when `cloudLayers` is empty,
exactly as designed.

### Observed present weather — the fourth safety-code factor (post-v1)

Came out of actually *reading* the Tripoli/NAR Unified Safety Code rather than guessing what to
build. It gates a launch on exactly four weather items: sustained wind ≤ 20 mph, no flight into or
through cloud, visibility to watch the whole flight, and no launch with a thunderstorm/lightning
nearby. Window already read three. The fourth was the gap — and the telling part is *why* it was a
gap: the whole storm story was **CAPE potential** (`StormPotential`, the conditions-grid storms
row), which says the atmosphere *could* build storms, not that one is overhead. The safety code and
the community (radar apps) gate on the storm actually being *there*.

The board already fetched the nearest station's METAR for the observed wind/ceiling/visibility
cross-check but ignored its **present-weather group** — the observed counterpart to CAPE. So
`parsePresentWeather` now reads the NWS `presentWeather` array (confirmed live, e.g. KFLG reporting
`HZ`/`FU` haze+smoke): a thunderstorm (`TS`/`VCTS`) or precipitation flags **red** as a launch
no-go, an obscuration (fog/haze/smoke/dust) **amber** because it cuts the sight the code's
observe-the-whole-flight rule needs. It lands in the sky panel and the briefing, framed honestly as
the *nearest station* (a heads-up that convection/precip is in the area, not a literal ten-mile
ruling) — the same honesty the observed wind cross-check carries. This is the observed half of a
story the board only had the modelled half of; with it, all four safety-code weather factors now
have a read.

### Landing drift from a descent rate (post-v1)

Came from researching what experienced flyers actually fuss over past the go/no-go: recovery drift
and landing prediction, the thing whole community tools exist for (drift calculators, "simulate
drift with live wind"). Window already did the hard half — the thickness-weighted **mean wind
aloft** vector — but the read stopped at a *rate* (feet per minute aloft), which makes the flyer do
the hang-time arithmetic. The research surfaced the missing piece as a one-liner: *"descend at 15
fps in a 10 mph wind and you drift 1 ft sideways for every foot of altitude lost."* That&apos;s
just `wind ÷ descent_rate` — and Window already had the other input it needs, the **expected
apogee** from the ceiling feature.

So an optional **descent rate** (ft/s — the unit rocketry quotes it in, kept unit-toggle-independent
like the apogee) turns the existing drift read into a landing distance: `driftPerFoot = mean_wind_fps
/ descent_fps`, and `driftLandingFt = driftPerFoot × apogee`. With the rate alone you get the
per-1,000-ft ratio; with the apogee too, an actual distance and the compass point it walks toward,
in the sky panel&apos;s sibling drift block and the briefing. Framed honestly to the end: a
**single-rate** estimate (a dual-deploy drogue lands it much closer), still the column&apos;s
average wind and not a trajectory sim — it leans the drift, it doesn&apos;t promise the spot. It
reuses the apogee input the board already took, so it&apos;s one new field completing a feature that
was already two-thirds built. The drift block stays useful with no inputs (the per-minute rate, plus
a nudge to set a descent rate), so the default board is unchanged.

### Remember the last field (post-v1)

The field lives in the URL — great for sharing, but it meant a flyer who just typed
`window.fusionspace.co` (or opened the bookmark without the query) landed on the empty prompt
every time, even though most use the tool for one home field. So the last viewed field is now
kept in `localStorage` (`window.lastField`), and a *bare* visit — no coordinates in the URL —
restores it, rewriting the URL with `replaceState` so the view stays shareable and reload-proof
and no stray history entry is added. A genuinely new user (nothing stored) still gets the empty
onboarding prompt; the URL, when it has coordinates, still wins. It's the same local-prefs
posture as units and saved fields: a convenience held in the browser, nothing sent anywhere.

### Quick-pick launch sites (post-v1)

v1 deliberately shipped *no curated directory* — the tool is field-agnostic and any coordinates
work. But the reality is that most flyers launch at a handful of established waivered sites, and
the empty state's single "try Lucerne Valley" example under-served that. So the location bar now
has a **Sites** toggle (beside Coordinates) revealing a one-tap chip list of well-known US
high-power / club sites — Black Rock, Lucerne (ROC), Argonia (Kloudbusters), Brothers (OROC),
Bong, NEFAR, and a few more, roughly west to east. It's a static list (`lib/launchSites.ts`, with
a typo-guard test bounding every coordinate to the continental US and forbidding dupes) — no API,
no new dependency. The honesty caveat is built into the UI and the data comment: these are
**approximate** launch-area coordinates (~1 km), not surveyed pads or an endorsement or a
waiver-status claim — a starting point you fine-tune with search or coordinates. That's why it's a
*small curated quick-pick*, not the full directory v1 ruled out: it lowers the barrier for the
core audience's first lookup without pretending to be authoritative.

### Saved fields, wind at a glance (post-v1)

Saved fields were just labels you click to load. A club running more than one launch site,
though, wants to know which is flyable *now* without opening each one — so each saved chip now
carries that field's current surface wind, toned against the 20 mph line (green/amber/red). It's
a deliberately tiny slice of the forecast — a "wind peek", current wind only, its own minimal
Open-Meteo request (`buildWindPeekUrl`) and pure parser (`lib/weather/peek.ts`) rather than a
whole board — fetched best-effort and held in a module-level cache with a ten-minute TTL, so the
glance survives remounts and back/forward without refetching and the picker never waits on it.
Failures are silent (no chip, not an error). It's the first thing that fetches for a field other
than the one in view, but it stays within the family's posture: a small honest figure, the same
20 mph reference as everywhere else, no verdict. (While here, the leftover `✕` text glyph on the
remove control became a proper `CloseIcon`, finishing the no-emoji, all-SVG iconography.)

### Seasonal normal — vs typical (post-v1)

The forecast says what's coming; it never says whether what's coming is *normal*. That's the
question a flyer weighs days out — wait for a better window, or accept that this is about as
good as the season gets here. So the outlook now sets the week against the field's own history:
a typical max wind for this week of the year, with the week ahead compared like with like — its
average daily-max against that normal, not a 7-day peak against an average (which would always
read windy) — and called windier, about typical, or calmer, with the peak shown for context. It's the first feature to reach past the single forecast request,
and it does so the family's way — as a **best-effort source, exactly like NWS**: a parallel call
to Open-Meteo's free historical archive (about five years of daily max wind/gust), summarised by
a pure, tested helper (`lib/weather/climatology.ts`) that averages the days within a week of the
same date across those years, with day-of-year math done on the ISO strings so it stays pure. If
the archive can't be reached the lookup just returns null and the board is unaffected — the
forecast remains the only hard dependency, so the central architecture holds. It renders as one
descriptive line in the outlook, never a verdict.

### Pressure tendency (post-v1)

Storm potential says how primed the air is; the barometer says whether it's actually changing.
A falling pressure is the oldest honest warning that weather is moving in — an approaching low
or front bringing the wind up and the ceiling down — while a rising one usually means settling.
The hourly station pressure was already on the wire (density altitude uses it), so a pure,
tested helper (`lib/weather/pressure.ts`) takes the change over the last few hours at the
current hour, with a 1 hPa dead-band so ordinary diurnal wobble reads as *steady*, and reports
the trend with its signed rate. "Right now" shows it as a small glyph (an up/down triangle or a
dash — no emoji) and the rate, with a falling barometer toned amber as the one direction worth a
second look; it rides into the briefing only when it's actually moving. It pairs naturally with
storm potential — destabilising air plus dropping pressure is a sharper heads-up than either
alone — and, like everything here, it states the rate and leaves the call to you. No new request
or dependency.

### Wind steadiness — gusts (post-v1)

The 20 mph line is a *sustained*-wind limit, and the board always showed the gust alongside the
sustained wind — but it never *interpreted* the gap, and gusty air is arguably a bigger off-the-rod
hazard than steady wind: a gust at the wrong instant pushes a rocket off heading right at the rail,
and rod whip and erratic weathercocking grow with the spread. So a pure, tested helper
(`lib/weather/gust.ts`) bands the sustained/gust pair into *steady / gusty / very gusty*. The catch
is that neither the ratio nor the spread alone is right: the gust factor (peak ÷ sustained)
over-flags a big ratio sitting on a light breeze (3 gusting 9 isn't a hazard), while a fixed mph
spread misses that the same 8 mph spread means more over a 6 mph mean than a 25 mph one. So it bands
on *either* a high factor *or* a wide absolute spread, with a light-air floor that keeps weak
variable wind reading steady. "Right now" shows the band inline on the gust line (toned, with a
one-line why when it's not steady), the fly-time snapshot carries it for the selected hour, and the
briefing notes it on the surface-wind line. It's the figures already on the page, interpreted for
rocketry — a turbulence heads-up, never a verdict. No new request or dependency.

### Conditions at a glance — the factor grid (post-v1)

Each panel answers one question well, but a flyer hunting for a launch window was left to
cross-reference four of them — surface wind, gusts, storm potential, rain — across time in their
head. So a dedicated panel lines those four up as a grid: four rows, one cell per hour for the
next two days, each cell green/amber/red. The honesty problem this raised is the obvious
temptation: blend the four into one go/no-go colour. That's exactly what the whole tool refuses
to do, so it stays four *separate* rows — each coloured against its **own** reference (wind and
gusts against the 20 mph line and any personal line via `windTone`/`gustiness`, storms by CAPE
band via `classifyCape`, rain by the hourly probability) — and the user reads the window across
them. The per-hour, per-factor mapping is a pure, tested helper (`lib/weather/conditions.ts`); the
component only paints what it returns, as an SVG strip matching the other charts, with a colour
key, an accessible table fallback, and per-column tooltips. It shares the fly-time selection, so
tapping a column moves the snapshot and the winds-aloft profile with it. The precip row is the one
genuinely new band (a chance-of-rain scale, falling back to the modelled amount when the model
gives no probability) — everything else is the board's existing reads, re-presented in time. No
new request or dependency; it's a synthesis view, not a new source.

### Observed wind cross-check & raw METAR (post-v1)

The surface wind on the board is a *model analysis*, not a measurement — the explainer always
said so, but the board offered nothing to weigh it against. The nearest NWS station we already
fetch for the ceiling also reports its *observed* wind, so "Right now" now shows that beside
the model figure: the station's measured wind and gust (converted from the METAR's km/h, or
m/s, to your unit), tagged with the station, its distance, and how long ago it reported, and
toned against the same 20 mph line. When the model says 21 and the anemometer twelve miles away
says 15, that gap is exactly what a flyer wants to see — it's the family's "model vs observed,
labelled honestly" ethos applied to the single most important number on the page. It's absent
when no station is reachable (the same graceful degradation as the ceiling), and it can differ
with distance and terrain, which the caption says plainly. The same observation carries the raw
METAR string, so the sky panel gained a "show the raw report" disclosure for anyone who reads
them. Both are free — the observation was already on the wire — and both ride into the field
briefing. No new request, no dependency; `metar.ts` just reads three more fields it was
ignoring.

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

As the board grew, the briefing fell behind it, so it was brought back in sync: it now also
carries the observed-wind cross-check, visibility, the pressure trend, **storm potential**
(the CAPE band with the day's peak — a whole board panel that the briefing had been silent on,
so a calm morning that towers up by afternoon now makes it into the club-chat post), and the
**0°C level** beside the winds-aloft samples. The principle holds: the briefing is exactly the
figures the board shows, nothing more — when a figure is absent (a model gap, no station), its
line is simply dropped rather than guessed.

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

### Per-day calm window in the outlook (post-v1)

The calm-window chips only look two days out, but the forecast (and the outlook) run seven —
so the outlook had an asymmetry: it showed each day's *maximum* wind but never said *when*
within the day it was flyable. A club planning next weekend's launch could see a day was
"windy" by its peak yet not learn it had a dead-calm morning. So each outlook card now carries
its **calmest daylight window** — the longest daylight stretch (today onward) whose sustained
wind stays at or under the active line, with a muted "no calm hour" when a day truly never drops
below it. It reuses the calm-window machinery rather than inventing a parallel one: the
run-finder was refactored to share a single `summarizeWindow` helper, and a new pure
`bestDaylightWindow(hourly, date, limit, fromIndex)` (tested) picks the longest sub-limit
daylight run on a given field-local date, breaking length ties toward the calmer peak and
looking *forward* from the current hour so today's window never counts hours already gone. It's
the same honest aggregation against a line you chose, extended from the 48-hour chips across the
whole planning week — and it reads off the seven days of hourly data already fetched, so it costs
no new dependency and no extra request. (While here: a long-standing JSX whitespace bug in the
outlook source line — "20 mph**limit**" with the space swallowed after the interpolation — was
fixed by moving the words into the interpolated string, and the new muted label was toned to the
card's proven `zinc-500/400` so it clears the WCAG contrast audit.)

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
Open-Meteo/NWS as the lat/long of the forecast request. The "My location" button is a
user-gesture `getCurrentPosition` (secure-context only) that distinguishes its failures —
a blocked permission, a timeout, an unavailable fix — and says which, instead of blaming
permissions for everything; the permission message names the iOS Settings path, since a
disabled Location Service (not the site) is the usual reason it "doesn't work" on an iPhone.

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

- **Scope of v1:** location (coords / search / geolocation, no curated directory — _revisited
  post-v1; see "Quick-pick launch sites"_); alerts; current conditions vs the 20 mph line; hourly
  timeline; winds-aloft AGL profile; ceiling/sky (observed + modeled); 7-day outlook; the
  derivation explainer; units toggle incl. knots; personal wind line; saved fields; last-known
  offline.
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
