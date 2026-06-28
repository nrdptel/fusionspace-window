import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import WeatherBoard from "@/components/WeatherBoard";

function Method({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium text-zinc-800 dark:text-zinc-200">{title}</h3>
      <p className="mt-1 max-w-3xl">{children}</p>
    </div>
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
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
        <span aria-hidden className="mt-0.5 shrink-0 text-base">
          ⚠
        </span>
        <p>
          <strong className="font-semibold">Window informs; it doesn&apos;t decide.</strong> It
          shows the weather and the published reference lines — the 20 mph surface-wind limit,
          winds aloft, the ceiling — and leaves the go/no-go call to you and your range&apos;s
          rules. Every figure is best-effort and carries its source and valid time. Confirm
          conditions yourself before you fly.
        </p>
      </div>

      <details className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <summary className="cursor-pointer select-none font-medium text-zinc-700 dark:text-zinc-300">
          How to read this
        </summary>
        <div className="mt-3 space-y-3 text-zinc-600 dark:text-zinc-400">
          <p>
            Pick a launch field and Window pulls the weather a flyer actually needs to decide
            whether to fly — fetched live in your browser, from the field you choose. It takes
            no rocket parameters and gives no verdict; it surfaces the data and the reference
            lines and lets you decide.
          </p>
          <ul className="space-y-2">
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Right now</strong>{" "}
              is the surface wind against the <strong>20 mph</strong> NFPA/NAR/Tripoli launch
              limit — a reference line, never a go/no-go. Winds are named for the direction they
              blow <em>from</em>.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Today &amp; tomorrow</strong>{" "}
              is the hourly wind, so you can find the calm window. Drag the slider to choose the
              hour shown in the winds-aloft profile.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Winds aloft</strong>{" "}
              is wind speed and direction by true height above the field, surface up to waiver
              altitudes — the thing general weather apps bury. Each pressure level is placed at
              its real height AGL.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Sky &amp; ceiling</strong>{" "}
              is the observed ceiling from the nearest reporting station where there is one,
              labelled <em>observed</em>, with a modelled multi-day cloud picture beside it.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Units &amp; sharing</strong>{" "}
              — toggle Imperial/Metric (and knots) any time; it never refetches. The field is in
              the URL, so a link is shareable and reload-proof. Saved fields, units, and your
              personal wind line stay in this browser.
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
          browser, for the field you chose. Here is where each one comes from, the model and
          valid time behind it, and where it can be wrong.
        </p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <Method title="Surface wind, temperature & precip">
            From the Open-Meteo Forecast API, using a US-optimised GFS/HRRR blend
            (<code className="font-mono text-xs">gfs_seamless</code>), requested in imperial
            units. The current reading carries its own valid time; it&apos;s a model analysis,
            not a station observation, so a gusty or terrain-affected field can differ from what
            you feel at the pad. Winds are the direction the air comes <em>from</em>.
          </Method>
          <Method title="The 20 mph line">
            NFPA 1127 and the NAR/Tripoli safety codes set 20 mph as the surface-wind ceiling
            for launching. Window draws it as a reference and colours the current wind as it
            approaches and crosses it — but it never says no-go. The call is yours, with your
            field&apos;s rules and your own judgment. A personal, lower line can be set and is
            stored only in your browser.
          </Method>
          <Method title="Winds aloft (the profile)">
            Open-Meteo pressure-level winds (1000 down to 250 hPa) for the selected hour. Each
            level is placed at its true height above the field: the level&apos;s geopotential
            height minus the field&apos;s ground elevation (Open-Meteo&apos;s reported elevation
            for the coordinates). Levels below the field are dropped. This is a model profile —
            resolution thins with altitude, and a real sounding can differ — but it&apos;s the
            best free upper-air data available, since NOAA retired the public RAP/rucsoundings
            feed for the continental US.
          </Method>
          <Method title="Cloud ceiling & sky">
            The observed ceiling is the lowest broken or overcast layer from the nearest NWS
            reporting station&apos;s latest observation (a METAR), converted to feet; the nearest
            automated stations that report no cloud layers are skipped. It&apos;s labelled
            <em> observed</em> and stamped with the station and how long ago it reported. The
            multi-day sky picture and the fallback when no station is reachable are Open-Meteo&apos;s
            modelled cloud cover, labelled <em>modelled</em>. A forecast ceiling in feet (TAF) is
            planned for a later version — its source has no browser access today.
          </Method>
          <Method title="Active alerts">
            NWS active watches, warnings, and advisories for the field
            (<code className="font-mono text-xs">/alerts/active</code>), most severe first.
            NWS is a best-effort enhancement: if it can&apos;t be reached, alerts and the observed
            ceiling are simply absent rather than shown as an error, and the sky falls back to the
            modelled cloud cover.
          </Method>
          <Method title="Multi-day outlook">
            Open-Meteo daily aggregates for ~7 days: high/low temperature, the day&apos;s maximum
            sustained wind and gust, dominant wind direction, peak precipitation probability, and
            mean cloud cover. A day whose max wind crosses 20 mph is marked — again as a
            reference, not a verdict.
          </Method>
          <Method title="Freshness, caching & offline">
            A field is fetched once and cached in your browser for about ten minutes, so a reload
            or a units change doesn&apos;t refetch. If you&apos;re offline or a fetch fails, Window
            shows the last data it successfully loaded for that field, with a prominent
            &ldquo;as of&rdquo; staleness flag. The service worker caches only the app shell for
            instant load — it never caches a forecast, so freshness is always real.
          </Method>
        </div>
      </section>

      <Footer />
    </main>
  );
}
