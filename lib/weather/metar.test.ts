import { describe, it, expect } from "vitest";
import obs from "./__fixtures__/nws-observation.json";
import obsClear from "./__fixtures__/nws-observation-clear.json";
import obsRaws from "./__fixtures__/nws-observation-raws.json";
import stations from "./__fixtures__/nws-stations.json";
import {
  haversineMiles,
  modelSky,
  parseMetarSky,
  parseObservation,
  parsePresentWeather,
  parseStations,
  stationSky,
  summarizeLayers,
} from "./metar";

/** Build a minimal observation properties object for the raw-METAR fallback tests. */
function obsOf(rawMessage: string, extra: Record<string, unknown> = {}) {
  return { properties: { rawMessage, cloudLayers: [], timestamp: "2026-06-28T18:50:00Z", ...extra } };
}

describe("parseObservation", () => {
  it("takes the ceiling from the lowest broken/overcast base (m→ft)", () => {
    const p = parseObservation(obs);
    // BKN at 1980 m ≈ 6496 ft is the lowest ceiling layer (FEW doesn't count).
    expect(p.ceilingFt).toBeGreaterThan(6000);
    expect(p.ceilingFt).toBeLessThan(7000);
    expect(p.layers).toHaveLength(3);
    expect(p.description).toBe("Mostly Cloudy");
    expect(p.usable).toBe(true);
  });

  it("converts observed visibility from metres to statute miles", () => {
    const p = parseObservation(obs);
    // 16093.44 m is exactly 10 statute miles.
    expect(p.visibilityMi).toBeCloseTo(10, 3);
  });

  it("reports null visibility when the station omits it", () => {
    const p = parseObservation(obsClear);
    expect(p.visibilityMi).toBeNull();
  });

  it("converts observed wind and gust from km/h to mph and keeps the raw report", () => {
    const p = parseObservation(obs);
    expect(p.windMph).toBeCloseTo(24.1 / 1.609344, 3); // ~14.98 mph
    expect(p.gustMph).toBeCloseTo(37.0 / 1.609344, 3); // ~22.99 mph
    expect(p.windDirDeg).toBe(250);
    expect(p.raw).toBe("KDAG 271953Z 25013G20KT 10SM FEW030 BKN065 OVC120 28/09 A2989 RMK AO2");
  });

  it("reports null wind and raw when the station omits them", () => {
    const p = parseObservation(obsClear);
    expect(p.windMph).toBeNull();
    expect(p.gustMph).toBeNull();
    expect(p.windDirDeg).toBeNull();
    expect(p.raw).toBeNull();
  });

  it("reports no ceiling for a clear sky but is still usable", () => {
    const p = parseObservation(obsClear);
    expect(p.ceilingFt).toBeNull();
    expect(p.usable).toBe(true);
    expect(p.description).toBe("Clear");
  });

  it("does not treat a structured CLR layer carrying a sensor-max base as a ceiling", () => {
    // Real automated stations (confirmed live at KORD and KDAG) send a structured cloudLayers
    // entry of CLR with a base at the sensor's ~12,000 ft clear-below height. It must read as
    // clear sky, never as a 12,500 ft "ceiling" the apogee read would clear against.
    const p = parseObservation({
      properties: {
        timestamp: "2026-06-28T18:50:00Z",
        textDescription: "Clear",
        cloudLayers: [{ amount: "CLR", base: { unitCode: "wmoUnit:m", value: 3810 } }],
      },
    });
    expect(p.layers[0].amount).toBe("CLR");
    expect(p.layers[0].baseFt).toBeGreaterThan(12000);
    expect(p.ceilingFt).toBeNull();
    expect(p.usable).toBe(true);
  });

  it("marks a station with no sky data (a RAWS site) unusable", () => {
    const p = parseObservation(obsRaws);
    expect(p.usable).toBe(false);
  });

  // The NWS API often returns an EMPTY cloudLayers array even when the raw METAR reports the
  // sky (a real, common case at the nearest station on clear days). The raw-METAR fallback
  // recovers it so the closest station isn't skipped for one 20+ miles out.
  it("recovers a clear sky (CLR) from the raw METAR when cloudLayers is empty", () => {
    const p = parseObservation(obsOf("KFIN 281850Z 06005KT 10SM CLR 33/24 A3006"));
    expect(p.usable).toBe(true);
    expect(p.ceilingFt).toBeNull();
    expect(p.layers).toHaveLength(0);
    expect(p.description).toBe("Clear");
  });

  it("recovers cloud layers (SCT030) from the raw METAR when cloudLayers is empty", () => {
    const p = parseObservation(obsOf("KEVB 281847Z 07009KT 10SM SCT030 31/26 A3006"));
    expect(p.usable).toBe(true);
    expect(p.layers).toEqual([{ amount: "SCT", baseFt: 3000 }]);
    // Scattered is not a ceiling, so there's still no ceiling figure.
    expect(p.ceilingFt).toBeNull();
    expect(p.description).toBe("Scattered clouds");
  });

  it("recovers a real ceiling (BKN/OVC) the structured field dropped", () => {
    const p = parseObservation(obsOf("KXYZ 281850Z 24013KT 6SM BKN015 OVC025 20/18 A2990"));
    // Lowest broken/overcast wins: BKN015 = 1,500 ft.
    expect(p.ceilingFt).toBe(1500);
    expect(p.usable).toBe(true);
  });

  it("leaves a sky-less AUTO report (wind/temp only) unusable", () => {
    // A real station with a cloud-sensor outage: wind and temp, but no visibility, no sky group.
    const p = parseObservation(obsOf("KP28 281856Z AUTO 18015G29KT 36/22 A2967 RMK AO1 $"));
    expect(p.usable).toBe(false);
    expect(p.layers).toHaveLength(0);
  });

  it("prefers the structured cloudLayers when they are present (no raw override)", () => {
    const p = parseObservation(obs); // KDAG: 3 structured layers + a raw METAR
    expect(p.layers).toHaveLength(3);
    expect(p.ceilingFt).toBeGreaterThan(6000);
  });

  it("carries observed present weather through to the parsed observation", () => {
    const p = parseObservation({
      properties: {
        timestamp: "2026-06-28T18:50:00Z",
        textDescription: "Thunderstorm",
        cloudLayers: [{ amount: "BKN", base: { unitCode: "wmoUnit:m", value: 600 } }],
        presentWeather: [{ intensity: "light", weather: "rain", rawString: "-RA" }, { weather: "thunderstorms", rawString: "TS" }],
      },
    });
    expect(p.presentWeather?.thunderstorm).toBe(true);
    expect(p.presentWeather?.precip).toBe(true);
    expect(p.presentWeather?.labels).toEqual(["Light rain", "Thunderstorm"]);
  });
});

describe("parsePresentWeather", () => {
  it("returns null when nothing is reported", () => {
    expect(parsePresentWeather(undefined)).toBeNull();
    expect(parsePresentWeather([])).toBeNull();
    expect(parsePresentWeather([{}])).toBeNull();
  });

  it("flags a thunderstorm as a red no-go", () => {
    const pw = parsePresentWeather([{ weather: "thunderstorms", rawString: "TS" }])!;
    expect(pw.thunderstorm).toBe(true);
    expect(pw.tone).toBe("red");
    expect(pw.labels).toEqual(["Thunderstorm"]);
  });

  it("reads a thunderstorm in the vicinity (VCTS) as 'nearby'", () => {
    const pw = parsePresentWeather([{ modifier: "vicinity", weather: "thunderstorms", rawString: "VCTS" }])!;
    expect(pw.thunderstorm).toBe(true);
    expect(pw.labels).toEqual(["Nearby thunderstorm"]);
  });

  it("flags precipitation as a red no-go and labels intensity / showers", () => {
    expect(parsePresentWeather([{ intensity: "light", weather: "rain", rawString: "-RA" }])!.labels).toEqual(["Light rain"]);
    expect(parsePresentWeather([{ modifier: "showers", weather: "rain", rawString: "SHRA" }])!.labels).toEqual(["Rain showers"]);
    const snow = parsePresentWeather([{ intensity: "heavy", weather: "snow", rawString: "+SN" }])!;
    expect(snow.precip).toBe(true);
    expect(snow.tone).toBe("red");
    expect(snow.labels).toEqual(["Heavy snow"]);
  });

  it("reads obscurations (the live KFLG haze + smoke) as an amber visibility cut, not a no-go", () => {
    const pw = parsePresentWeather([
      { weather: "haze", rawString: "HZ" },
      { weather: "smoke", rawString: "FU" },
    ])!;
    expect(pw.obscuration).toBe(true);
    expect(pw.thunderstorm).toBe(false);
    expect(pw.precip).toBe(false);
    expect(pw.tone).toBe("amber");
    expect(pw.labels).toEqual(["Haze", "Smoke"]);
  });

  it("detects a thunderstorm from the raw token even if the weather field is blank", () => {
    const pw = parsePresentWeather([{ rawString: "TSRA" }])!;
    expect(pw.thunderstorm).toBe(true);
    expect(pw.labels).toEqual(["TSRA"]);
  });
});

describe("parseMetarSky", () => {
  it("reads cloud groups as hundreds of feet AGL, ignoring the remarks section", () => {
    const sky = parseMetarSky("KDAG 271953Z 25013G20KT 10SM FEW030 BKN065 OVC120 28/09 A2989 RMK AO2 SLP123");
    expect(sky.clear).toBe(false);
    expect(sky.layers).toEqual([
      { amount: "FEW", baseFt: 3000 },
      { amount: "BKN", baseFt: 6500 },
      { amount: "OVC", baseFt: 12000 },
    ]);
  });

  it("flags clear-sky tokens and a vertical-visibility ceiling", () => {
    expect(parseMetarSky("KFIN 281850Z 06005KT 10SM CLR 33/24 A3006").clear).toBe(true);
    expect(parseMetarSky("X 010000Z 00000KT CAVOK 20/10 Q1015").clear).toBe(true);
    const vv = parseMetarSky("X 010000Z 09005KT 1/4SM FG VV002 12/12 A2990");
    expect(vv.clear).toBe(false);
    expect(vv.layers).toEqual([{ amount: "VV", baseFt: 200 }]);
  });

  it("finds nothing in a report with no sky group", () => {
    const sky = parseMetarSky("KP28 281856Z AUTO 18015G29KT 36/22 A2967 RMK AO1");
    expect(sky.layers).toHaveLength(0);
    expect(sky.clear).toBe(false);
  });
});

describe("parseStations", () => {
  it("reads identifiers, names, and coordinates in order", () => {
    const list = parseStations(stations);
    expect(list).toHaveLength(3);
    expect(list[0].id).toBe("BPFC1");
    expect(list[1].id).toBe("KDAG");
    expect(list[0].lat).toBeCloseTo(34.41, 2);
  });
});

describe("haversineMiles", () => {
  it("measures a sane distance between nearby points", () => {
    const d = haversineMiles({ lat: 34.45, lon: -116.95 }, { lat: 34.854, lon: -116.787 });
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(40);
  });
  it("is zero for the same point", () => {
    expect(haversineMiles({ lat: 34, lon: -116 }, { lat: 34, lon: -116 })).toBeCloseTo(0, 5);
  });
});

describe("summarizeLayers", () => {
  it("names the densest layer", () => {
    expect(summarizeLayers([{ amount: "OVC", baseFt: 5000 }])).toBe("Overcast");
    expect(summarizeLayers([{ amount: "BKN", baseFt: 5000 }])).toBe("Broken clouds");
    expect(summarizeLayers([{ amount: "FEW", baseFt: 5000 }])).toBe("Few clouds");
    expect(summarizeLayers([])).toBe("—");
  });
});

describe("sky builders", () => {
  it("stationSky carries station + ceiling, modelSky carries cloud cover", () => {
    const p = parseObservation(obs);
    const s = stationSky({ id: "KDAG", name: "Daggett", lat: 34.8, lon: -116.8 }, 28, p);
    expect(s.source).toBe("station");
    expect(s.station?.id).toBe("KDAG");
    expect(s.station?.distanceMi).toBe(28);
    expect(s.visibilityMi).toBeCloseTo(10, 3);
    expect(s.observedWindMph).toBeCloseTo(14.98, 1);
    expect(s.observedGustMph).toBeCloseTo(22.99, 1);
    expect(s.observedWindDirDeg).toBe(250);
    expect(s.raw).toContain("KDAG");

    const m = modelSky(42);
    expect(m.source).toBe("model");
    expect(m.cloudCoverPct).toBe(42);
  });
});
