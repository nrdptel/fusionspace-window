/** Density altitude — the altitude in the standard atmosphere at which the air has the
 *  same density as the air at the field right now. It's the honest way to say "how thin is
 *  the air," and flyers care because thinner air means a motor makes less thrust, a rocket
 *  coasts and recovers differently, and it climbs higher out of sight for tracking. Hot,
 *  high, humid days push it well above the field's ground elevation.
 *
 *  This is a standard, well-defined meteorological figure with a clear formula — not a
 *  proprietary model and not a verdict. It's computed from the field's actual (station)
 *  pressure, temperature, and humidity; field elevation is shown only for context (it is
 *  not an input — that's a common misconception). All pure and tested. */

const RD = 287.058; // specific gas constant, dry air — J/(kg·K)
const RV = 461.495; // specific gas constant, water vapour — J/(kg·K)
const G0 = 9.80665; // standard gravity — m/s²
const RHO0 = 1.225; // ISA sea-level density — kg/m³
const T0 = 288.15; // ISA sea-level temperature — K
const L = 0.0065; // ISA temperature lapse rate — K/m
const FT_PER_M = 3.280839895;
// ISA density varies with height as (1 - L h / T0)^(g/(Rd·L) - 1).
const DENSITY_EXP = G0 / (RD * L) - 1; // ≈ 4.2559

export interface DensityInputs {
  tempF: number;
  rhPct: number;
  /** Actual pressure at the field (station pressure), hPa. */
  pressureHpa: number;
}

/** Saturation vapour pressure over water (hPa) for a temperature in °C — Magnus form. */
export function saturationVaporPressureHpa(tempC: number): number {
  return 6.1078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/** Moist-air density (kg/m³) from temperature, relative humidity, and station pressure. */
export function airDensityKgM3({ tempF, rhPct, pressureHpa }: DensityInputs): number {
  const tempC = ((tempF - 32) * 5) / 9;
  const tempK = tempC + 273.15;
  const pPa = pressureHpa * 100;
  const rh = Math.max(0, Math.min(1, rhPct / 100));
  const pv = rh * saturationVaporPressureHpa(tempC) * 100; // vapour partial pressure, Pa
  const pd = pPa - pv; // dry-air partial pressure, Pa
  return pd / (RD * tempK) + pv / (RV * tempK);
}

/** Pressure altitude (ft) — the ISA altitude matching the station pressure, ignoring
 *  temperature and humidity. Shown alongside density altitude in the explainer. */
export function pressureAltitudeFt(pressureHpa: number): number {
  if (!Number.isFinite(pressureHpa) || pressureHpa <= 0) return NaN;
  const hM = (T0 / L) * (1 - Math.pow(pressureHpa / 1013.25, (RD * L) / G0));
  return hM * FT_PER_M;
}

/** Density altitude (ft). Returns NaN when an input is missing or unphysical. */
export function densityAltitudeFt(inputs: DensityInputs): number {
  const { tempF, pressureHpa } = inputs;
  if (!Number.isFinite(tempF) || !Number.isFinite(pressureHpa) || pressureHpa <= 0) return NaN;
  const rho = airDensityKgM3(inputs);
  if (!Number.isFinite(rho) || rho <= 0) return NaN;
  // Invert ISA: rho/rho0 = (1 - L h/T0)^DENSITY_EXP  →  h = (T0/L)(1 - (rho/rho0)^(1/DENSITY_EXP))
  const hM = (T0 / L) * (1 - Math.pow(rho / RHO0, 1 / DENSITY_EXP));
  return hM * FT_PER_M;
}
