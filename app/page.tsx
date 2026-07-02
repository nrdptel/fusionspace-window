import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import WeatherBoard from "@/components/WeatherBoard";
import { AlertTriangleIcon } from "@/components/icons";

function Method({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium text-zinc-800 dark:text-zinc-200">{title}</h3>
      <p className="mt-1 max-w-3xl">{children}</p>
    </div>
  );
}

/** A collapsed methodology group — keeps the deep write-ups one click away, like the
 *  sibling tools, so the page stays clean by default. */
function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <summary className="cursor-pointer select-none text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {title}
      </summary>
      <div className="mt-4 space-y-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {children}
      </div>
    </details>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      {/* First tab stop: jump past the header/controls straight to the location bar. */}
      <a
        href="#location"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to the location picker
      </a>

      <SiteHeader />

      {/* Safety framing — Window informs, it does not decide. */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
        <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong className="font-semibold">Window informs; it doesn&apos;t decide.</strong> It
          surfaces the weather against the published reference lines — the 20 mph wind limit,
          winds aloft, the ceiling — and leaves the go/no-go call to you. Confirm conditions
          yourself before you fly.
        </p>
      </div>

      <details className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <summary className="cursor-pointer select-none font-medium text-zinc-700 dark:text-zinc-300">
          How to read this
        </summary>
        <div className="mt-3 space-y-3 text-zinc-600 dark:text-zinc-400">
          <p>
            Pick a launch field and Window pulls the weather a flyer needs — live, in your
            browser. It takes no rocket parameters and gives no verdict; it surfaces the data and
            the reference lines and lets you decide.
          </p>
          <ul className="space-y-2">
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Right now</strong>{" "}
              is the surface wind against the <strong>20 mph</strong> NFPA/NAR/Tripoli launch
              limit — a reference line, never a go/no-go — plus temperature, sky, and{" "}
              <strong>density altitude</strong> (how thin the air is, which sets thrust and
              descent). The model wind is cross-checked against the nearest station&apos;s{" "}
              <strong>observed</strong> reading, and a <strong>pressure tendency</strong> shows
              whether the barometer is rising or falling. Winds are named for the direction they
              blow <em>from</em>.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">The next 3 days</strong>{" "}
              is the hourly wind, with the upcoming <strong>calm windows</strong> surfaced above
              it. Drag the <strong>fly-time</strong> slider (or tap a window) to any hour and the
              snapshot shows that hour&apos;s wind, density altitude, and storm potential — and the
              winds-aloft profile follows it — so you read the conditions for when you plan to fly,
              not just now.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Conditions at a glance</strong>{" "}
              stacks the next 3 days as four colored rows — wind, gusts, storms, and rain — each
              against its own line, so you can spot a window where everything clears at once. Tap a
              column to set the fly-time. There&apos;s no blended go/no-go; the rows stay separate
              so the call is yours.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Winds aloft</strong>{" "}
              is wind speed and direction by true height above the field, surface up to waiver
              altitudes — the thing general weather apps bury. Each pressure level is placed at
              its real height AGL, the column&apos;s <strong>mean wind</strong> tells you which
              way recovery tends to drift, and the <strong>0°C line</strong> marks where the air
              turns sub-freezing.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Storm potential</strong>{" "}
              reads convective instability (CAPE) and the day&apos;s peak, so a calm morning that
              towers up by mid-afternoon doesn&apos;t catch you out — a heads-up, never a verdict.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Sky &amp; ceiling</strong>{" "}
              is the observed ceiling and <strong>visibility</strong> from the nearest reporting
              station where there is one, labeled <em>observed</em> (modeled where there
              isn&apos;t), with a modeled multi-day cloud picture beside it.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Air quality &amp; smoke</strong>{" "}
              is the US AQI and the smoke/dust particulate — because haze cuts the visibility you
              need to track a high flight (and a smoked-out field is a real reason a launch gets
              scrubbed). It&apos;s a best-effort read; if it can&apos;t be fetched, it&apos;s simply
              absent.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Units &amp; sharing</strong>{" "}
              — toggle Imperial/Metric (and knots) any time; it never refetches. The field is in
              the URL, so a link is shareable and reload-proof, and a bare visit comes back to
              your last field. Saved fields, units, and your personal wind line stay in this
              browser, and each saved field shows its current wind at a glance — handy when a
              club runs more than one site.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Take it to the field</strong>{" "}
              — &ldquo;Copy briefing&rdquo; puts a plain-text summary of the conditions on your
              clipboard for the club chat; &ldquo;Copy link&rdquo; shares the exact view.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Offline</strong> —
              if a fetch fails or you lose signal, Window shows the last data it loaded for that
              field with an &ldquo;as of&rdquo; flag, never a stale reading dressed as fresh.
            </li>
          </ul>
        </div>
      </details>

      <div className="mt-8">
        <WeatherBoard />
      </div>

      {/* How this is derived — source, model, valid time, and limits for every figure. */}
      <section id="sources" className="mt-16 scroll-mt-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight">How this is derived</h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Every number on this page is fetched live from a free public provider, in your
          browser, for the field you chose. Open a section for where it comes from, the model
          and valid time behind it, and where it can be wrong.
        </p>

        <div className="mt-6 space-y-3">
          <Disclosure title="Surface conditions — wind, density altitude & pressure">
          <Method title="Surface wind, temperature & precip">
            From the Open-Meteo Forecast API, using a US-optimized GFS/HRRR blend
            (<code className="font-mono text-xs">gfs_seamless</code>), requested in imperial
            units. The current reading carries its own valid time; it&apos;s a model analysis,
            not a station observation, so a gusty or terrain-affected field can differ from what
            you feel at the pad. Winds are the direction the air comes <em>from</em>.
          </Method>
          <Method title="Wind steadiness (gusts)">
            The 20 mph line is a <em>sustained</em>-wind limit, but gusty, variable air is its
            own hazard — a gust at the wrong moment pushes a rocket off heading right at the rail,
            and rod whip and erratic weathercocking get worse as the spread grows. So
            &ldquo;Right now&rdquo; (and the fly-time snapshot) read the gust against the sustained
            wind and call it <em>steady</em>, <em>gusty</em>, or <em>very gusty</em> — banded by
            both the gust factor (peak ÷ sustained) and the absolute spread, so a big ratio over a
            light breeze isn&apos;t over-flagged and a wide spread over a strong wind isn&apos;t
            missed. It&apos;s the same figures already shown (sustained and gust), just interpreted
            — a heads-up about turbulence, never a verdict.
          </Method>
          <Method title="Observed wind cross-check">
            Because the surface wind above is a model analysis, &ldquo;Right now&rdquo; also
            shows the <em>observed</em> wind from the nearest NWS reporting station — the same
            METAR that gives the ceiling — converted from its reported units to your wind unit,
            and stamped with the station, its distance, and how long ago it reported. It&apos;s a
            real anemometer reading to weigh the model against: when they disagree, that gap is
            itself worth knowing. It can differ with distance and terrain, and it&apos;s absent
            when no station is reachable. The full raw report (the METAR text) is available under
            the sky panel for anyone who reads them.
          </Method>
          <Method title="Density altitude">
            The altitude in the standard atmosphere where the air has the same density as the
            air at the field right now — the honest way to say how thin the air is. It&apos;s
            computed from the field&apos;s actual (station) pressure, temperature, and humidity:
            the moist-air density (dry and water-vapor partial pressures over the gas
            constants) inverted through the ISA density profile. Field elevation is shown only
            for context — it isn&apos;t an input, a common misconception. It matters because
            thinner air means a motor makes less thrust, descent under chute runs a little
            faster, and the rocket climbs higher out of sight for tracking; hot, high, humid
            days push it well above the ground. A figure, with its formula — not a verdict.
          </Method>
          <Method title="Pressure tendency">
            &ldquo;Right now&rdquo; also shows which way the barometer is moving — the change in
            the field&apos;s station pressure over the last few hours, from the hourly series, with
            a small dead-band so ordinary daily wobble reads as steady. A falling barometer is the
            oldest honest warning that weather is on the way in (an approaching low or front
            bringing wind up and ceiling down); a rising one usually means high pressure building
            and conditions settling. It pairs with storm potential — the air destabilising while
            the pressure drops is a sharper heads-up than either alone. The rate is shown, not a
            verdict.
          </Method>
          <Method title="Dew point & the spread">
            Beside the humidity, &ldquo;Right now&rdquo; gives the <strong>dew point</strong> — the
            temperature the air would have to cool to for its moisture to condense — derived from
            the temperature and relative humidity by the Magnus formula. The number that earns its
            place is the <em>spread</em> between the temperature and the dew point: as it closes
            toward zero the air is near saturation, so fog and dew (and condensation on a cold
            altimeter or recovery harness) become likely; a wide spread is dry air. A spread within
            about 4°F is fog and low-stratus territory — the same morning fog that delays a launch
            and cuts the visibility you need to track and recover. It&apos;s the standard moisture
            read the hobby-rocketry checklists ask for, shown as a figure, not a verdict.
          </Method>
          </Disclosure>

          <Disclosure title="The 20 mph launch line">
            <p className="max-w-3xl">
              NFPA 1127 and the NAR/Tripoli safety codes set 20 mph as the surface-wind ceiling
              for launching. Window draws it as a reference and colors the current wind as it
              approaches and crosses it — but it never says no-go. The call is yours, with your
              field&apos;s rules and your own judgment. A personal, lower line can be set and is
              stored only in your browser.
            </p>
          </Disclosure>

          <Disclosure title="Winds aloft — profile, shear, drift &amp; freezing level">
          <Method title="Winds aloft (the profile)">
            Open-Meteo pressure-level winds (1000 down to 250 hPa) for the selected hour. Each
            level is placed at its true height above the field: the level&apos;s geopotential
            height minus the field&apos;s ground elevation (Open-Meteo&apos;s reported elevation
            for the coordinates). Levels below the field are dropped. This is a model profile —
            resolution thins with altitude, and a real sounding can differ — but it&apos;s the
            best free upper-air data available, since NOAA retired the public RAP/rucsoundings
            feed for the continental US.
          </Method>
          <Method title="Wind shear">
            The profile also flags its <em>strongest shear layer</em> — the adjacent pair of
            levels whose wind changes the most, measured as the magnitude of the vector
            difference between the two winds (so a big speed jump, a directional veer, or both
            all count). A sharp layer is what tips a rocket off its heading off the rail and
            walks the recovery downrange, which is part of why flyers read soundings at all.
            It&apos;s plain geometry over the levels already plotted — pure and tested — and,
            like everything here, it points the layer out and leaves the decision to you.
          </Method>
          <Method title="Mean wind & drift">
            The profile also reports its <em>mean wind</em> — the single wind vector that,
            blowing uniformly from the ground to the top of the shown column, would carry a
            recovering rocket the same net distance as the real profile. Each level&apos;s wind
            is turned into a velocity vector and averaged, weighted by the thickness of the
            altitude band it stands for, so opposing winds cancel the way they do in the air: a
            column that veers around the compass has a smaller mean than its scalar average.
            It&apos;s the honest one-number answer to which way recovery tends to walk, named
            for the direction the rocket drifts <em>toward</em> (the opposite of the wind&apos;s
            source). It changes with the Top selector, so you can read the mean to 10k or to the
            whole column. The drift also carries a <em>rate</em> — how far downrange recovery
            walks for each minute aloft (just the mean wind as distance-over-time, ×88 from mph to
            ft/min) — so you multiply by your own time under chute for a rough downrange distance.
          </Method>
          <Method title="Landing drift from a descent rate">
            Give a <strong>descent rate</strong> (ft/s, the figure your main comes down at) and the
            drift turns into a distance. It&apos;s the flyers&apos; rule of thumb made exact: the
            mean wind divided by the descent rate is how far the rocket walks sideways for every foot
            it falls — descend at 15 ft/s in a 10 mph (≈ 14.7 ft/s) wind and it&apos;s about a foot
            of drift per foot of altitude. Multiply by your <strong>expected apogee</strong> and you
            get the actual landing distance and the compass point it walks toward. It&apos;s a
            single-rate estimate — a dual-deploy drogue covers most of the altitude fast and lands
            the rocket much closer — and it&apos;s still the column&apos;s average wind, not a
            trajectory simulation; it leans the drift, it doesn&apos;t promise the spot.
          </Method>
          <Method title="Freezing level (0°C)">
            The profile also draws the <strong>0°C level</strong> — the height where the air
            turns sub-freezing on the way up — as a blue reference line. It&apos;s Open-Meteo&apos;s
            modeled freezing-level height (reported above sea level) expressed as height above
            the field, and it moves with the fly-time hour like the rest of the profile. A high
            flight that punches well past it climbs into real cold, which is worth knowing for
            altimeter batteries and recovery electronics; it&apos;s hidden when the shown column
            is entirely above or below it. A figure, not a verdict.
          </Method>
          </Disclosure>

          <Disclosure title="Sky, ceiling &amp; visibility">
          <Method title="Cloud ceiling, visibility & sky">
            The observed ceiling is the lowest broken or overcast layer from the nearest NWS
            reporting station&apos;s latest observation (a METAR), converted to feet. A clear sky
            counts: when a station reports <em>clear</em> (or a layer the structured feed happens
            to drop), the raw METAR is read directly so the nearest station is used rather than one
            tens of miles out — only a station that says nothing about the sky at all is skipped.
            It&apos;s labeled <em>observed</em> and stamped with the station and how long ago it
            reported. The multi-day sky picture and the fallback when no station is reachable are
            Open-Meteo&apos;s modeled cloud cover, labeled <em>modeled</em>. A forecast ceiling
            in feet (TAF) is planned for a later version — its source has no browser access today.
          </Method>
          <Method title="Ceiling vs your apogee">
            A waiver doesn&apos;t let you fly into or through cloud, so the ceiling is a hard
            go/no-go gate, not a comfort number. Type your expected apogee in the controls above the
            board and the sky panel reads the observed ceiling against it: a peak comfortably below
            the deck is <em>Clear</em>, one within a buffer of it is <em>Tight</em>, and a peak at or
            above the deck is a <em>No-go</em>. The buffer is the larger of 500&nbsp;ft or 15% of the
            apogee, because a predicted peak carries real error — motor impulse, mass and drag each
            move it — so a flight that only just sneaks under isn&apos;t a confident clearance. It&apos;s
            a read, not a ruling: the altitude you enter and the call you make are yours.
          </Method>
          <Method title="Low-cloud outlook">
            The observed ceiling is honest but <em>now</em> only — it can&apos;t tell you low cloud
            is forecast to build tomorrow afternoon, which is exactly what you&apos;d want to know
            before driving out. So beside it is Open-Meteo&apos;s modeled <em>low-cloud</em> cover
            across the next 3 days, banded thin / broken / overcast. Low cloud is the layer that
            usually forms a launch-blocking ceiling; high cirrus doesn&apos;t, so it&apos;s left out.
            It&apos;s cover, not a forecast ceiling height — deliberately softer than the observed
            read — so treat it as a heads-up while the observed ceiling keeps the go/no-go.
          </Method>
          <Method title="Observed weather (present-weather)">
            The Tripoli/NAR safety code names four weather no-go items; three — wind over the limit,
            flight into cloud, and losing sight of the rocket — Window already reads. The fourth is a
            thunderstorm or precipitation, and that&apos;s an <em>observed</em> question, not a CAPE
            one: storm potential says the atmosphere <em>could</em> build storms, but it can&apos;t
            tell you one is overhead. So the nearest station&apos;s METAR present-weather group is
            read directly — a reported thunderstorm (TS, or VCTS in the vicinity) or precipitation is
            flagged red as a launch no-go, and an obscuration (fog, haze, smoke) amber, since it cuts
            the visibility the code&apos;s &ldquo;observe the whole flight&rdquo; rule depends on. Like
            the wind cross-check it&apos;s the nearest station, so read it as a heads-up that
            convection or precip is in the area, not a literal ten-mile ruling.
          </Method>
          <Method title="Visibility">
            Horizontal visibility in statute miles — it matters for keeping a high flight in
            sight and for the cloud-and-visibility rules many waivers carry. Like the ceiling,
            it prefers the nearest station&apos;s observed value (the METAR visibility, in
            meters, converted to miles) and is labeled <em>observed</em>; when no station is
            reachable it falls back to Open-Meteo&apos;s modeled visibility for the current hour,
            labeled <em>modeled</em>. Observed values top out around the METAR&apos;s 10-mile
            reporting ceiling; the model can read higher in genuinely clear air.
          </Method>
          <Method title="Air quality & wildfire smoke">
            The US Air Quality Index (the standard 0–500 EPA scale, banded Good through Hazardous)
            plus the fine and coarse particulate — PM2.5 is the wildfire-<em>smoke</em> proxy, PM10
            the dust — from Open-Meteo&apos;s air-quality model (CAMS). It earns a place here, not
            just as a health number, because smoke and haze cut the visibility you need to keep a
            high flight in sight, and a smoked-out field (a regular event in the western US in fire
            season) is a real reason a launch gets called. Like the seasonal normal and NWS it&apos;s
            a <strong>best-effort</strong> source on its own request: if it can&apos;t be reached the
            panel is simply absent and the rest of the board is unaffected. A figure on a standard
            scale, not a verdict.
          </Method>
          </Disclosure>

          <Disclosure title="Storm potential &amp; active alerts">
          <Method title="Storm potential (CAPE)">
            Convective available potential energy from Open-Meteo — the standard measure of how
            primed the atmosphere is to build thunderstorms, in joules per kilogram. Window shows
            the current value and the day&apos;s peak, sorted into the bands meteorologists use
            (roughly: under 300 stable, 300–1000 marginal, 1000–2500 moderate, above 2500
            strong). Afternoon convection cancels more summer launches than wind does, and a calm
            morning can tower up by mid-afternoon — so it&apos;s a heads-up to watch the sky, not
            a verdict. It pairs with the NWS alerts, which carry any actual watch or warning.
          </Method>
          <Method title="Active alerts">
            NWS active watches, warnings, and advisories for the field
            (<code className="font-mono text-xs">/alerts/active</code>), most severe first.
            NWS is a best-effort enhancement: if it can&apos;t be reached, alerts and the observed
            ceiling are simply absent rather than shown as an error, and the sky falls back to the
            modeled cloud cover. The seasonal normal (above) and the observed station readings are
            best-effort in the same way — the forecast itself is the only hard dependency.
          </Method>
          </Disclosure>

          <Disclosure title="Planning ahead — calm windows, outlook &amp; seasonal normal">
          <Method title="Conditions at a glance (the grid)">
            Each panel answers one question; the conditions grid lines four of them up hour by hour
            for the next 3 days so you can find a window where they all clear at once without
            reading four charts. Each row is colored against its <em>own</em> reference — wind and
            gusts against the {`20 mph`} line (and your personal line), storm potential by CAPE
            band, the chance of rain by the hourly probability — green/amber/red. It is deliberately
            <em> not</em> a blended go/no-go score: the rows stay separate, each an honest read, so
            the decision is still yours. Tapping a column sets the fly-time, moving the snapshot and
            the winds-aloft profile with it. Plain re-presentation of figures already on the page —
            no new request or dependency.
          </Method>
          <Method title="Calm windows">
            The hourly forecast already knows when the wind lays down, so Window surfaces the
            upcoming stretches where the <em>sustained</em> wind stays at or below your line (the
            20 mph reference, or a lower personal one), scanning the next 3 days from now. Each
            window shows its peak wind and gust and whether it falls in daylight (Open-Meteo&apos;s
            day/night flag). It is plain aggregation of the hourly numbers against a line you
            chose — it highlights low-wind daylight stretches, it doesn&apos;t tell you to fly.
          </Method>
          <Method title="Multi-day outlook & daylight">
            Open-Meteo daily aggregates for ~7 days: high/low temperature, the day&apos;s maximum
            sustained wind and gust, dominant wind direction, peak precipitation probability, mean
            cloud cover, and sunrise/sunset (field-local — for planning setup and leaving daylight
            for recovery). A day whose max wind crosses 20 mph is marked — again as a reference,
            not a verdict. Each day also surfaces its <em>calmest daylight window</em>: the longest
            upcoming daylight stretch (today onward) whose sustained wind stays at or under your
            line, read from the same hourly forecast as the calm windows above. It&apos;s how a day
            flagged windy by its single peak can still show a flyable morning — the same plain
            aggregation against a line you chose, extended across the planning week.
          </Method>
          <Method title="Seasonal normal (vs typical)">
            The outlook also sets the week against the field&apos;s own history: a
            <em> typical</em> max wind for this week of the year, averaged from about five years of
            Open-Meteo&apos;s daily archive over a window of dates around the same week. The week
            ahead is compared like with like — its <em>average</em> daily-max against that normal,
            not a 7-day peak against an average (which would always read windy) — and called
            <em> windier</em>, <em>about typical</em>, or <em>calmer</em>, with the peak shown for
            context. It answers the planning question — wait for a better window, or accept that
            this is about as good as the season gets here. Like NWS, it&apos;s a best-effort
            enhancement: if the archive can&apos;t be reached it&apos;s simply absent, and the
            board is unaffected. A descriptive comparison, not a verdict.
          </Method>
          </Disclosure>

          <Disclosure title="The field briefing">
            <p className="max-w-3xl">
              &ldquo;Copy briefing&rdquo; assembles a plain-text summary of the field — surface
              wind against the limit with the observed cross-check, sky, ceiling and visibility,
              any observed present-weather no-go, the pressure trend, density altitude and the
              dew-point spread, storm potential, a few winds-aloft levels with the mean wind and
              the 0°C level, any alerts, the next calm window, and a short outlook — to paste into
              a club chat. It&apos;s exactly the figures shown on the page,
              with the share link and the not-authoritative disclaimer baked in, so a briefing
              carries the same honesty as the board. Nothing is sent anywhere; the text is built
              in your browser and copied to your clipboard.
            </p>
          </Disclosure>

          <Disclosure title="Freshness, caching &amp; offline">
            <p className="max-w-3xl">
            A field is fetched once and cached in your browser for about ten minutes, so a reload
            or a units change doesn&apos;t refetch. If you&apos;re offline or a fetch fails, Window
            shows the last data it successfully loaded for that field, with a prominent
            &ldquo;as of&rdquo; staleness flag. The service worker caches only the app shell for
            instant load — it never caches a forecast, so freshness is always real.
            </p>
          </Disclosure>
        </div>
      </section>

      <Footer />
    </main>
  );
}
