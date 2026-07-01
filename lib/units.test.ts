import { describe, it, expect } from "vitest";
import {
  degToCompass,
  fmtLength,
  fmtTemp,
  fmtVisibility,
  fmtWind,
  lengthFromFt,
  limitLabel,
  precipFromIn,
  resolveUnits,
  tempFromF,
  visFromMiles,
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

describe("limitLabel", () => {
  it("shows the bare 20 mph in imperial, and the converted value with mph in parens otherwise", () => {
    expect(limitLabel("mph")).toBe("20 mph");
    expect(limitLabel("kmh")).toBe("32 km/h (20 mph)");
    expect(limitLabel("kn")).toBe("17 kn (20 mph)");
  });
});

describe("visibility conversion", () => {
  it("keeps statute miles for imperial and converts to km for metric", () => {
    expect(visFromMiles(10, "ft")).toBe(10);
    expect(visFromMiles(10, "m")).toBeCloseTo(16.09, 2);
    expect(fmtVisibility(10, "ft")).toBe("10");
    expect(fmtVisibility(10, "m")).toBe("16");
  });

  it("shows sub-unit visibility with precision instead of rounding fog down to 0", () => {
    // A 1/4-mile fog observation must not read "0 mi".
    expect(fmtVisibility(0.25, "ft")).toBe("0.25");
    expect(fmtVisibility(0.5, "ft")).toBe("0.5");
    // Metric: 0.25 mi ≈ 0.4 km — still shown, not zeroed.
    expect(fmtVisibility(0.25, "m")).toBe("0.4");
    // The clean 2–60 range stays whole.
    expect(fmtVisibility(10, "ft")).toBe("10");
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

describe("no negative zero", () => {
  it("renders a value that rounds to zero from below as 0, not -0", () => {
    // A dew point of 31.5°F is -0.28°C — rounds to -0, which would render "-0 °C".
    expect(fmtTemp(31.5, "C")).toBe("0");
    // A freezing level a hair below the field shouldn't show "-0 ft" either.
    expect(fmtLength(-0.1, "ft")).toBe("0");
    // Genuine non-zero values are untouched.
    expect(fmtTemp(30, "F")).toBe("30");
  });
});
