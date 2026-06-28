# Security Policy

This is a hobby project, but security reports are very welcome.

## Reporting a vulnerability

Please **report privately** — do not open a public issue for security problems.

Use GitHub's private vulnerability reporting:
[**Report a vulnerability**](https://github.com/nrdptel/fusionspace-window/security/advisories/new)

Please include steps to reproduce and the impact you observed. I'll acknowledge
as soon as I can and work on a fix; since this is a side project, response times
are best-effort.

## Scope

This is a fully static site: there is no backend, no API, and no accounts. The
board runs entirely in your browser. The only network calls it makes are directly
to the public weather providers (Open-Meteo and NWS) to fetch the forecast for the
field you choose; the only data it stores (your unit/preference choices, saved
fields, and the last-known forecast per field) stays in your browser's local
storage — nothing is uploaded to us.

In scope: the web app itself (the page, the client-side fetching, parsing, and
state handling) and the build/deploy pipeline.

Out of scope: third-party services this integrates with (Cloudflare for hosting,
Open-Meteo and NWS for data) — report those to the respective provider. A forecast
that turns out to be wrong is not a security issue; it's the best-effort nature of
weather data, which is why every figure carries its source and valid time.

## Known advisories

`npm audit` reports a **moderate** advisory in `postcss`, pulled in transitively
by Next.js. It concerns PostCSS's CSS *stringify* output and only affects
**build-time** processing of CSS. This project builds only its own first-party
Tailwind CSS (no untrusted CSS is processed), so there is no runtime exposure.
There is no fix available in the current Next.js major; it will clear when a
Next.js release bundles a patched PostCSS. Tracked, not a release blocker.
