import { describe, it, expect } from "vitest";
import { describeWeather } from "./wmo";

describe("describeWeather", () => {
  it("labels known codes and flags precipitation", () => {
    expect(describeWeather(0).label).toBe("Clear");
    expect(describeWeather(0).precip).toBe(false);
    expect(describeWeather(2).label).toBe("Partly cloudy");
    expect(describeWeather(61).label).toBe("Light rain");
    expect(describeWeather(61).precip).toBe(true);
    expect(describeWeather(95).precip).toBe(true);
  });

  it("uses the day or night icon for clear-ish codes", () => {
    expect(describeWeather(0, true).icon).toBe("sun");
    expect(describeWeather(0, false).icon).toBe("moon");
    expect(describeWeather(2, true).icon).toBe("partly-day");
    expect(describeWeather(2, false).icon).toBe("partly-night");
  });

  it("falls back gracefully for an unknown code", () => {
    expect(describeWeather(1234).label).toBe("—");
    expect(describeWeather(1234).icon).toBe("cloud");
  });
});
