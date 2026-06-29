import { describe, it, expect } from "vitest";
import { classifyAqi, parseAirQuality } from "./airquality";

describe("classifyAqi", () => {
  it("bands the AQI into the standard EPA categories with three tones", () => {
    expect(classifyAqi(30)).toMatchObject({ band: "good", tone: "emerald" });
    expect(classifyAqi(75)).toMatchObject({ band: "moderate", tone: "amber" });
    expect(classifyAqi(130)).toMatchObject({ band: "usg", tone: "amber" });
    expect(classifyAqi(175)).toMatchObject({ band: "unhealthy", tone: "red" });
    expect(classifyAqi(250)).toMatchObject({ band: "very-unhealthy", tone: "red" });
    expect(classifyAqi(400)).toMatchObject({ band: "hazardous", tone: "red" });
  });

  it("puts the category boundaries on the EPA breakpoints", () => {
    expect(classifyAqi(50).band).toBe("good");
    expect(classifyAqi(51).band).toBe("moderate");
    expect(classifyAqi(100).band).toBe("moderate");
    expect(classifyAqi(101).band).toBe("usg");
  });
});

describe("parseAirQuality", () => {
  it("reads the US AQI and particulate from the current block", () => {
    const aq = parseAirQuality({ current: { us_aqi: 78, pm2_5: 24.3, pm10: 35 } });
    expect(aq).not.toBeNull();
    expect(aq!.usAqi).toBe(78);
    expect(aq!.category.band).toBe("moderate");
    expect(aq!.pm25).toBeCloseTo(24.3, 2);
    expect(aq!.pm10).toBe(35);
  });

  it("rounds the AQI and tolerates missing particulate", () => {
    const aq = parseAirQuality({ current: { us_aqi: 42.6 } });
    expect(aq!.usAqi).toBe(43);
    expect(aq!.pm25).toBeNull();
    expect(aq!.pm10).toBeNull();
  });

  it("returns null when the headline AQI is missing or the payload is empty", () => {
    expect(parseAirQuality({ current: { pm2_5: 10 } })).toBeNull();
    expect(parseAirQuality({})).toBeNull();
    expect(parseAirQuality(null)).toBeNull();
  });
});
