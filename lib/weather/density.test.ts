import { describe, it, expect } from "vitest";
import {
  airDensityKgM3,
  densityAltitudeFt,
  pressureAltitudeFt,
  saturationVaporPressureHpa,
} from "./density";

describe("saturationVaporPressureHpa", () => {
  it("matches known reference points", () => {
    // ~6.1 hPa at 0 °C, ~23.4 hPa at 20 °C.
    expect(saturationVaporPressureHpa(0)).toBeCloseTo(6.11, 1);
    expect(saturationVaporPressureHpa(20)).toBeGreaterThan(22);
    expect(saturationVaporPressureHpa(20)).toBeLessThan(24);
  });
});

describe("airDensityKgM3", () => {
  it("returns ~1.225 kg/m³ at ISA sea level (15 °C, 1013.25 hPa, dry)", () => {
    expect(airDensityKgM3({ tempF: 59, rhPct: 0, pressureHpa: 1013.25 })).toBeCloseTo(1.225, 2);
  });
  it("humidity lowers density (moist air is lighter)", () => {
    const dry = airDensityKgM3({ tempF: 86, rhPct: 0, pressureHpa: 1000 });
    const humid = airDensityKgM3({ tempF: 86, rhPct: 90, pressureHpa: 1000 });
    expect(humid).toBeLessThan(dry);
  });
});

describe("densityAltitudeFt", () => {
  it("is ~0 at ISA sea-level conditions", () => {
    // Within a couple of feet of zero (the residual is the defined ρ0 vs the value the
    // gas constant reconstructs — physically this is sea-level standard air).
    expect(Math.abs(densityAltitudeFt({ tempF: 59, rhPct: 0, pressureHpa: 1013.25 }))).toBeLessThan(3);
  });

  it("rises with heat and falls with pressure, and exceeds the pressure altitude when hot", () => {
    // Hot day at a high-desert field (~5000 ft pressure altitude).
    const hot = densityAltitudeFt({ tempF: 95, rhPct: 20, pressureHpa: 843 });
    expect(hot).toBeGreaterThan(pressureAltitudeFt(843));
    expect(hot).toBeGreaterThan(7000);

    // Hotter air is thinner → higher DA at the same pressure.
    const warm = densityAltitudeFt({ tempF: 70, rhPct: 20, pressureHpa: 843 });
    expect(hot).toBeGreaterThan(warm);
  });

  it("humidity raises density altitude", () => {
    const dry = densityAltitudeFt({ tempF: 86, rhPct: 0, pressureHpa: 900 });
    const humid = densityAltitudeFt({ tempF: 86, rhPct: 95, pressureHpa: 900 });
    expect(humid).toBeGreaterThan(dry);
  });

  it("returns NaN for missing inputs", () => {
    expect(densityAltitudeFt({ tempF: NaN, rhPct: 20, pressureHpa: 900 })).toBeNaN();
    expect(densityAltitudeFt({ tempF: 70, rhPct: 20, pressureHpa: 0 })).toBeNaN();
  });
});
