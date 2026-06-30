import { describe, it, expect } from "vitest";
import forecastFixture from "./__fixtures__/forecast.json";
import obs from "./__fixtures__/nws-observation.json";
import alertsFixture from "./__fixtures__/nws-alerts.json";
import airQualityFixture from "./__fixtures__/airquality.json";
import { parseForecast, type RawForecast } from "./forecast";
import { parseObservation, stationSky } from "./metar";
import { parseAlerts } from "./alerts";
import { parseAirQuality } from "./airquality";
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
  return {
    forecast,
    sky,
    alerts: parseAlerts(alertsFixture),
    climatology: null,
    airQuality: parseAirQuality(airQualityFixture),
    fetchedAt: 0,
  };
}

describe("buildBriefing", () => {
  const text = buildBriefing(board(), {
    units: DEFAULT_UNITS,
    hourIndex: 12, // the fixture's current hour (12:00)
    windLine: null,
    apogee: null,
    descentRate: null,
    shareUrl: "https://window.fusionspace.co/?lat=34.45&lon=-116.95",
  });

  it("leads with the field and a valid time", () => {
    expect(text).toContain("Window — Lucerne Valley, CA");
    expect(text).toContain("34.450, -116.950");
    expect(text).toContain("valid 12:00 PM field-local");
  });

  it("states the surface wind against the 20 mph limit, noting the gustiness", () => {
    // Fixture is 21 gusting 29 — an 8 mph spread reads as gusty.
    expect(text).toMatch(/Surface wind: 21 mph from WSW \(255°\), gusting 29, gusty — over the 20 mph limit/);
  });

  it("adds the nearest station's observed wind as a cross-check", () => {
    expect(text).toMatch(/Nearest station \(KDAG\) observed 15 mph from WSW, gust 23/);
  });

  it("notes a moving barometer", () => {
    expect(text).toMatch(/Pressure: falling 3\.0 hPa over 3h/);
  });

  it("adds the modeled low-cloud outlook beneath the sky line", () => {
    // Fixture low cloud is thin at the current hour, building to an 85% overcast deck by
    // midday tomorrow.
    expect(text).toMatch(/Low cloud \(modeled\): Thin now, building to overcast \(85%\) by Tomorrow 12 PM/);
  });

  it("reports the dew point and the temperature spread", () => {
    expect(text).toMatch(/Dew point: -?\d+°F \(\d+°F spread — (dry air|humid|near saturation)[^)]*\)/);
  });

  it("includes the observed ceiling, density altitude, and winds aloft", () => {
    expect(text).toMatch(/Sky: Mostly Cloudy, ceiling [\d,]+ ft \(KDAG, observed\)/);
    expect(text).toMatch(/Visibility: 10 mi \(observed\)/);
    expect(text).toMatch(/density altitude ~[\d,]+ ft/);
    expect(text).toMatch(/Winds aloft \(AGL ft\/mph\):/);
    expect(text).toMatch(/Mean wind to [\d,]+ ft: \d+ mph from [NSEW]+ — drift toward [NSEW]+, ~[\d,]+ ft\/min aloft/);
  });

  it("surfaces storm potential headlined on the day's CAPE peak, matching the on-screen panel", () => {
    // Fixture: current CAPE 900 (marginal), towering to 1,700 (moderate) by mid-afternoon. The
    // headline follows the worse of now/peak — same as the StormPotential card — so the board and
    // the copied briefing never disagree on the label. The "now" value still rides in the detail.
    expect(text).toMatch(/Storm potential: Moderately unstable \(CAPE 900 J\/kg now, peaking ~1700 by 2 PM\)/);
  });

  it("includes the 0°C freezing level alongside the winds aloft", () => {
    // Fixture: ~11,800 ft AGL at noon (14,763 ft MSL over a 2,953 ft field).
    expect(text).toMatch(/0°C level: 11,8\d\d ft AGL/);
  });

  it("notes air quality when it's worse than Good", () => {
    // Fixture: AQI 78 (Moderate), PM2.5 ~24.
    expect(text).toMatch(/Air quality: AQI 78 \(Moderate\), PM2\.5 24/);
  });

  it("includes alerts, a calm window, and the short outlook", () => {
    expect(text).toContain("Alerts: Wind Advisory (Moderate)");
    // The window runs overnight, so the end day is named — not a bare "2 PM–10 AM".
    expect(text).toMatch(/Next calm window \(≤20 mph\): Today 2 PM – Tomorrow 10 AM/);
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
      apogee: null,
      descentRate: null,
      shareUrl: "https://window.fusionspace.co/?lat=34.45&lon=-116.95",
    });
    expect(metric).toMatch(/km\/h/);
    expect(metric).toMatch(/°C/);
  });

  it("adds a ceiling-clearance line when an expected apogee is set", () => {
    const base = {
      units: DEFAULT_UNITS,
      hourIndex: 12,
      windLine: null,
      apogee: null,
      descentRate: null,
      shareUrl: "https://window.fusionspace.co/?lat=34.45&lon=-116.95",
    };
    // Fixture ceiling is BKN ~6,496 ft. A 9,000 ft peak flies into it.
    const nogo = buildBriefing(board(), { ...base, apogee: 9000 });
    expect(nogo).toMatch(/Ceiling vs 9,000 ft apogee: No-go — [\d,]+ ft into the deck/);
    // A 2,000 ft peak clears it comfortably.
    const clear = buildBriefing(board(), { ...base, apogee: 2000 });
    expect(clear).toMatch(/Ceiling vs 2,000 ft apogee: Clear — [\d,]+ ft of room below your 2,000 ft peak/);
    // With no apogee set, the line is absent.
    expect(buildBriefing(board(), { ...base, apogee: null })).not.toMatch(/apogee:/);
  });

  it("adds a landing-drift line when a descent rate and apogee are both set", () => {
    const base = {
      units: DEFAULT_UNITS,
      hourIndex: 12,
      windLine: null,
      apogee: 5000,
      shareUrl: "https://window.fusionspace.co/?lat=34.45&lon=-116.95",
    };
    const txt = buildBriefing(board(), { ...base, descentRate: 18 });
    expect(txt).toMatch(
      /Landing drift: from 5,000 ft at 18 ft\/s, ~[\d,]+ ft \([\d.]+ mi\) toward [NSEW]+ — single-rate estimate/,
    );
    // Absent without a descent rate, even with an apogee.
    expect(buildBriefing(board(), { ...base, descentRate: null })).not.toMatch(/Landing drift/);
  });
});
