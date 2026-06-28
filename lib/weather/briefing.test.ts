import { describe, it, expect } from "vitest";
import forecastFixture from "./__fixtures__/forecast.json";
import obs from "./__fixtures__/nws-observation.json";
import alertsFixture from "./__fixtures__/nws-alerts.json";
import { parseForecast, type RawForecast } from "./forecast";
import { parseObservation, stationSky } from "./metar";
import { parseAlerts } from "./alerts";
import { buildBriefing } from "./briefing";
import type { BoardData } from "./model";
import { DEFAULT_UNITS } from "../units";

function board(): BoardData {
  const forecast = parseForecast(forecastFixture as unknown as RawForecast, "gfs_seamless", "Lucerne Valley, CA");
  const sky = stationSky(
    { id: "KDAG", name: "Barstow-Daggett Airport", lat: 34.854, lon: -116.787 },
    28,
    parseObservation(obs),
  );
  return { forecast, sky, alerts: parseAlerts(alertsFixture), climatology: null, fetchedAt: 0 };
}

describe("buildBriefing", () => {
  const text = buildBriefing(board(), {
    units: DEFAULT_UNITS,
    hourIndex: 12, // the fixture's current hour (12:00)
    windLine: null,
    shareUrl: "https://window.fusionspace.co/?lat=34.45&lon=-116.95",
  });

  it("leads with the field and a valid time", () => {
    expect(text).toContain("Window — Lucerne Valley, CA");
    expect(text).toContain("34.450, -116.950");
    expect(text).toContain("valid 12:00 PM field-local");
  });

  it("states the surface wind against the 20 mph limit", () => {
    expect(text).toMatch(/Surface wind: 21 mph from WSW \(255°\), gusting 29 — over the 20 mph limit/);
  });

  it("adds the nearest station's observed wind as a cross-check", () => {
    expect(text).toMatch(/Nearest station \(KDAG\) observed 15 mph from WSW, gust 23/);
  });

  it("notes a moving barometer", () => {
    expect(text).toMatch(/Pressure: falling 3\.0 hPa over 3h/);
  });

  it("includes the observed ceiling, density altitude, and winds aloft", () => {
    expect(text).toMatch(/Sky: Mostly Cloudy, ceiling [\d,]+ ft \(KDAG, observed\)/);
    expect(text).toMatch(/Visibility: 10 mi \(observed\)/);
    expect(text).toMatch(/density altitude ~[\d,]+ ft/);
    expect(text).toMatch(/Winds aloft \(AGL ft\/mph\):/);
    expect(text).toMatch(/Mean wind to [\d,]+ ft: \d+ mph from [NSEW]+ — drift toward [NSEW]+/);
  });

  it("includes alerts, a calm window, and the short outlook", () => {
    expect(text).toContain("Alerts: Wind Advisory (Moderate)");
    expect(text).toMatch(/Next calm window \(≤20 mph\):/);
    expect(text).toMatch(/Outlook \(°F\): Today \d+\/\d+/);
  });

  it("ends with the share link and the not-authoritative disclaimer", () => {
    expect(text).toContain("https://window.fusionspace.co/?lat=34.45&lon=-116.95");
    expect(text).toContain("Best-effort, not authoritative — confirm conditions yourself before flying.");
  });

  it("converts to metric when asked", () => {
    const metric = buildBriefing(board(), {
      units: { system: "metric", windKnots: false },
      hourIndex: 12,
      windLine: null,
      shareUrl: "https://window.fusionspace.co/?lat=34.45&lon=-116.95",
    });
    expect(metric).toMatch(/km\/h/);
    expect(metric).toMatch(/°C/);
  });
});
