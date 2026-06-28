import { describe, it, expect } from "vitest";
import {
  degToCompass,
  fmtWind,
  lengthFromFt,
  precipFromIn,
  resolveUnits,
  tempFromF,
  windFromMph,
} from "./units";

describe("wind conversion", () => {
  it("converts mph to the offered units", () => {
    expect(windFromMph(10, "mph")).toBe(10);
    expect(windFromMph(10, "kn")).toBeCloseTo(8.69, 2);
    expect(windFromMph(10, "kmh")).toBeCloseTo(16.09, 2);
    expect(windFromMph(10, "ms")).toBeCloseTo(4.47, 2);
  });
});

describe("temperature conversion", () => {
  it("converts °F to °C", () => {
    expect(tempFromF(32, "C")).toBeCloseTo(0, 6);
    expect(tempFromF(212, "C")).toBeCloseTo(100, 6);
    expect(tempFromF(50, "F")).toBe(50);
  });
});

describe("length & precip conversion", () => {
  it("converts feet to metres and inches to mm", () => {
    expect(lengthFromFt(1000, "m")).toBeCloseTo(304.8, 1);
    expect(lengthFromFt(1000, "ft")).toBe(1000);
    expect(precipFromIn(1, "mm")).toBeCloseTo(25.4, 6);
  });
});

describe("degToCompass", () => {
  it("maps degrees to a 16-point label", () => {
    expect(degToCompass(0)).toBe("N");
    expect(degToCompass(90)).toBe("E");
    expect(degToCompass(180)).toBe("S");
    expect(degToCompass(270)).toBe("W");
    expect(degToCompass(255)).toBe("WSW");
    expect(degToCompass(360)).toBe("N");
  });
});

describe("resolveUnits", () => {
  it("derives the active units from the prefs", () => {
    expect(resolveUnits({ system: "imperial", windKnots: false })).toMatchObject({
      wind: "mph",
      temp: "F",
      length: "ft",
      precip: "in",
    });
    expect(resolveUnits({ system: "metric", windKnots: false }).wind).toBe("kmh");
    expect(resolveUnits({ system: "imperial", windKnots: true }).wind).toBe("kn");
    expect(resolveUnits({ system: "metric", windKnots: true }).temp).toBe("C");
  });
});

describe("fmtWind", () => {
  it("formats a converted value with trimmed precision", () => {
    expect(fmtWind(21, "mph")).toBe("21");
    expect(fmtWind(21, "kn", 1)).toBe("18.2");
  });
});
