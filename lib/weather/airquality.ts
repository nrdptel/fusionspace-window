/** Air quality & wildfire smoke — a best-effort enhancement, the same posture as NWS and the
 *  seasonal normal: a parallel call to Open-Meteo's free, keyless Air-Quality API, and if it
 *  can't be reached the board is unaffected. It matters for two rocketry-specific reasons that
 *  general weather apps frame only as health: smoke and haze cut the visibility you need to
 *  TRACK a high flight against the sky, and a smoked-out field (common in the western US in fire
 *  season) is a real reason a launch gets scrubbed. This reads the US AQI plus the fine/coarse
 *  particulate (PM2.5 ≈ smoke, PM10 ≈ dust) and bands the AQI into the standard EPA categories.
 *  Pure and tested; a figure with its meaning, never a verdict. */

import type { WindTone } from "./limits";

export type AqiBand =
  | "good"
  | "moderate"
  | "usg"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

export interface AqiCategory {
  band: AqiBand;
  label: string;
  tone: WindTone;
  /** Plain-words meaning, rocketry-flavoured (tracking + the pad), never a verdict. */
  blurb: string;
}

export interface AirQuality {
  /** US EPA Air Quality Index (0–500). */
  usAqi: number;
  category: AqiCategory;
  /** Fine particulate (≈ smoke), µg/m³ — null when absent. */
  pm25: number | null;
  /** Coarse particulate (≈ dust), µg/m³ — null when absent. */
  pm10: number | null;
}

/** Standard US EPA AQI categories, mapped to the board's three tones. */
export function classifyAqi(usAqi: number): AqiCategory {
  if (usAqi <= 50) {
    return { band: "good", label: "Good", tone: "emerald", blurb: "Clear air — no smoke or haze worth a thought." };
  }
  if (usAqi <= 100) {
    return {
      band: "moderate",
      label: "Moderate",
      tone: "amber",
      blurb: "A little haze possible; tracking a high flight should still be fine.",
    };
  }
  if (usAqi <= 150) {
    return {
      band: "usg",
      label: "Unhealthy for sensitive groups",
      tone: "amber",
      blurb: "Hazy — smoke can soften a flight against the sky, and it's a health note for sensitive flyers.",
    };
  }
  if (usAqi <= 200) {
    return {
      band: "unhealthy",
      label: "Unhealthy",
      tone: "red",
      blurb: "Smoky — haze can cut the visibility you need to track a flight, and it's a health concern at the pad.",
    };
  }
  if (usAqi <= 300) {
    return {
      band: "very-unhealthy",
      label: "Very unhealthy",
      tone: "red",
      blurb: "Heavy smoke — poor tracking visibility and a real health concern at the field.",
    };
  }
  return {
    band: "hazardous",
    label: "Hazardous",
    tone: "red",
    blurb: "Hazardous air — heavy smoke; tracking and health are both compromised.",
  };
}

export interface RawAirQuality {
  current?: Record<string, number | string | null>;
  current_units?: Record<string, string>;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Parse the Air-Quality `current` block. Returns null when the US AQI (the headline) is
 *  missing, so the board simply omits the panel rather than showing a blank. */
export function parseAirQuality(raw: unknown): AirQuality | null {
  const c = (raw as RawAirQuality)?.current ?? {};
  const usAqi = num(c.us_aqi);
  if (usAqi == null) return null;
  return {
    usAqi: Math.round(usAqi),
    category: classifyAqi(usAqi),
    pm25: num(c.pm2_5),
    pm10: num(c.pm10),
  };
}
