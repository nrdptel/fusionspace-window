# Contributing

Thanks for your interest! This is a personal hobby project, but issues and PRs
are welcome — especially corrections to how a figure is derived, fixes to a
parser when a provider changes a field, and anything that makes the data clearer
or more honest about its limits.

## Project layout

This is a single Next.js app, statically exported. There is no backend — all
weather data is fetched client-side from free public APIs.

- `app/` — the page, the privacy page, layout, metadata, robots/sitemap, and
  error/not-found pages.
- `components/` — the board UI: the location bar, the panels (current, hourly,
  winds aloft, sky, outlook, alerts), the charts, the explainer, theme toggle,
  header, footer.
- `lib/weather/` — the data layer. `net.ts` is the thin, impure fetch layer; every
  other module is pure parsing/deriving (Open-Meteo → view model, pressure levels →
  AGL profile, METAR cloud layers → ceiling, alerts) with tests and fixtures
  alongside in `__fixtures__/`.
- `lib/` — unit conversions, URL-state serialization, the per-field cache, and the
  monthly observances. Pure functions, with tests alongside.
- `public/` — brand marks, icons, the OG image, and the Cloudflare `_headers`.

The parsing is deliberately isolated from the network so it can be read and tested
on its own, against checked-in fixtures — the unit tests never hit the live APIs.

## Setup

```bash
npm install
npm run dev   # http://localhost:3000
```

## Checks (run before opening a PR)

These mirror CI (`.github/workflows/test.yml`); all must pass.

```bash
npm run lint        # eslint
npm test            # vitest unit tests (fixtures only — no network)
npm run build       # also type-checks (CI gate; tsconfig has noUnusedLocals/Params)
npm run test:e2e    # Playwright with the APIs stubbed (incl. an axe audit) — run after a build
```

## Conventions

- Match the surrounding code's style, naming, and comment density.
- Keep commits focused; describe the *why* in the message.
- Tests must be deterministic and must not call the live weather APIs — stub them
  with fixtures (unit) or Playwright route interception (e2e).
- Never present a figure as more certain than it is. Every number carries its
  source and valid time, and the tool gives no go/no-go verdict — keep that intact.
