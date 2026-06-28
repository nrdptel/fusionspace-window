import { describe, it, expect } from "vitest";
import obs from "./__fixtures__/nws-observation.json";
import obsClear from "./__fixtures__/nws-observation-clear.json";
import obsRaws from "./__fixtures__/nws-observation-raws.json";
import stations from "./__fixtures__/nws-stations.json";
import {
  haversineMiles,
  modelSky,
  parseObservation,
  parseStations,
  stationSky,
  summarizeLayers,
} from "./metar";

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

  it("reports no ceiling for a clear sky but is still usable", () => {
    const p = parseObservation(obsClear);
    expect(p.ceilingFt).toBeNull();
    expect(p.usable).toBe(true);
    expect(p.description).toBe("Clear");
  });

  it("marks a station with no sky data (a RAWS site) unusable", () => {
    const p = parseObservation(obsRaws);
    expect(p.usable).toBe(false);
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

    const m = modelSky(42);
    expect(m.source).toBe("model");
    expect(m.cloudCoverPct).toBe(42);
  });
});
