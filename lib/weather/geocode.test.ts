import { describe, it, expect } from "vitest";
import geocoding from "./__fixtures__/geocoding.json";
import { parseGeocode, placeLabel } from "./geocode";

describe("parseGeocode", () => {
  it("reads results into places with compact labels", () => {
    const places = parseGeocode(geocoding);
    expect(places).toHaveLength(2);
    expect(places[0].name).toBe("Lucerne Valley");
    expect(places[0].label).toBe("Lucerne Valley, California");
    expect(places[0].lat).toBeCloseTo(34.4439, 3);
  });

  it("returns nothing for an empty response", () => {
    expect(parseGeocode({})).toEqual([]);
    expect(parseGeocode({ results: [] })).toEqual([]);
  });
});

describe("placeLabel", () => {
  it("drops the country for US places and keeps it otherwise", () => {
    expect(placeLabel("Lucerne Valley", "California", "United States", "US")).toBe(
      "Lucerne Valley, California",
    );
    expect(placeLabel("Paris", "Île-de-France", "France", "FR")).toBe(
      "Paris, Île-de-France, France",
    );
  });
});
