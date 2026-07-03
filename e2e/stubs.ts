import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Deterministic API stubs for e2e. CI never touches Open-Meteo or NWS — every request is
// intercepted and answered from the same checked-in fixtures the unit tests use. This
// mirrors how the Motor Finder keeps CI deterministic with a tracked snapshot.

const DIR = join(process.cwd(), "lib", "weather", "__fixtures__");
const read = (name: string) => readFileSync(join(DIR, name), "utf-8");

function json(route: Route, name: string) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: read(name),
  });
}

export interface StubOptions {
  /** Open-Meteo forecast availability (the hard dependency). */
  forecast?: "ok" | "down";
  /** NWS availability (alerts + observed ceiling). */
  nws?: "ok" | "down";
  /** Open-Meteo historical archive availability (the seasonal normal). */
  archive?: "ok" | "down";
  /** Open-Meteo air-quality availability (US AQI + smoke). */
  airQuality?: "ok" | "down";
  /** Station observations: "mixed" (a RAWS then a real METAR), "allRaws" — every nearby station
   *  is a no-sky RAWS (the real case at a remote desert field like Black Rock), or "thunderstorm"
   *  — KDAG reporting observed TSRA (present-weather no-go). */
  observations?: "mixed" | "allRaws" | "thunderstorm";
}

/** Install all provider stubs. Call BEFORE page.goto — the board fetches on mount. */
export async function installStubs(page: Page, opts: StubOptions = {}): Promise<void> {
  const forecast = opts.forecast ?? "ok";
  const nws = opts.nws ?? "ok";
  const archive = opts.archive ?? "ok";
  const airQuality = opts.airQuality ?? "ok";
  const observations = opts.observations ?? "mixed";

  // The same-origin all-sites feed (public/api/v1/conditions.json) is baked at build time from live data,
  // so default it to empty for determinism — the overview is then absent unless a test stubs it.
  await page.route("**/api/v1/conditions.json", (route) =>
    route.fulfill({ contentType: "application/json", body: '{"generatedAt":null,"model":"gfs_seamless","sites":[]}' }),
  );

  await page.route("https://api.open-meteo.com/v1/forecast**", (route) => {
    if (forecast === "down") return route.abort("failed");
    return json(route, "forecast.json");
  });

  await page.route("https://archive-api.open-meteo.com/**", (route) => {
    if (archive === "down") return route.abort("failed");
    return json(route, "archive.json");
  });

  await page.route("https://air-quality-api.open-meteo.com/**", (route) => {
    if (airQuality === "down") return route.abort("failed");
    return json(route, "airquality.json");
  });

  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    json(route, "geocoding.json"),
  );

  await page.route("https://api.weather.gov/**", (route) => {
    if (nws === "down") return route.abort("failed");
    const url = route.request().url();
    if (url.includes("/alerts/active")) return json(route, "nws-alerts.json");
    if (url.includes("/observations/latest")) {
      if (observations === "allRaws") return json(route, "nws-observation-raws.json");
      if (url.includes("/stations/BPFC1/")) return json(route, "nws-observation-raws.json");
      if (url.includes("/stations/KDAG/"))
        return json(route, observations === "thunderstorm" ? "nws-observation-wx.json" : "nws-observation.json");
      return json(route, "nws-observation-clear.json");
    }
    if (url.includes("/stations")) return json(route, "nws-stations.json");
    if (url.includes("/points/")) return json(route, "nws-point.json");
    return route.fulfill({ status: 404, body: "{}" });
  });
}

/** The example field the fixtures describe. */
export const FIELD_URL = "/?lat=34.45&lon=-116.95&label=Lucerne%20Valley%2C%20CA";
