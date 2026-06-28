import { describe, it, expect } from "vitest";
import { buildForecastUrl, buildGeocodeUrl, MODEL } from "./net";

// Only the pure URL builders are tested — the fetchers are deliberately untested so CI
// never touches the live providers.

describe("buildForecastUrl", () => {
  const url = buildForecastUrl(34.45, -116.95);
  const params = new URL(url).searchParams;

  it("targets the Open-Meteo forecast endpoint with the field coordinates", () => {
    expect(url.startsWith("https://api.open-meteo.com/v1/forecast?")).toBe(true);
    expect(params.get("latitude")).toBe("34.45");
    expect(params.get("longitude")).toBe("-116.95");
  });

  it("requests imperial units and the US-optimised model", () => {
    expect(params.get("temperature_unit")).toBe("fahrenheit");
    expect(params.get("wind_speed_unit")).toBe("mph");
    expect(params.get("precipitation_unit")).toBe("inch");
    expect(params.get("models")).toBe(MODEL);
    expect(params.get("forecast_days")).toBe("7");
  });

  it("asks for the current, daily, and pressure-level fields the board needs", () => {
    expect(params.get("current")).toContain("wind_gusts_10m");
    expect(params.get("daily")).toContain("wind_direction_10m_dominant");
    const hourly = params.get("hourly")!;
    expect(hourly).toContain("wind_speed_500hPa");
    expect(hourly).toContain("geopotential_height_250hPa");
    expect(hourly).toContain("precipitation_probability");
  });
});

describe("buildGeocodeUrl", () => {
  it("targets the geocoding endpoint with the query", () => {
    const url = buildGeocodeUrl("Lucerne Valley");
    const params = new URL(url).searchParams;
    expect(url.startsWith("https://geocoding-api.open-meteo.com/v1/search?")).toBe(true);
    expect(params.get("name")).toBe("Lucerne Valley");
    expect(params.get("count")).toBe("6");
  });
});
