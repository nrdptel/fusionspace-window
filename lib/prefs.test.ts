import { describe, it, expect } from "vitest";
import {
  addSaved,
  parseLastField,
  parseSaved,
  parseUnits,
  parseWindLine,
  removeSaved,
  type SavedField,
} from "./prefs";

describe("parseLastField", () => {
  it("reads a stored field, with or without a label", () => {
    expect(parseLastField(JSON.stringify({ lat: 34.45, lon: -116.95, label: "Lucerne Valley" }))).toEqual({
      lat: 34.45,
      lon: -116.95,
      label: "Lucerne Valley",
    });
    expect(parseLastField(JSON.stringify({ lat: 40.78, lon: -119.21 }))).toEqual({
      lat: 40.78,
      lon: -119.21,
      label: undefined,
    });
  });

  it("rejects junk and non-finite coordinates", () => {
    expect(parseLastField(null)).toBeNull();
    expect(parseLastField("not json")).toBeNull();
    expect(parseLastField(JSON.stringify({ lat: "x", lon: 1 }))).toBeNull();
    expect(parseLastField(JSON.stringify({ lon: -116.95 }))).toBeNull();
  });
});

describe("parseUnits", () => {
  it("defaults to imperial and validates the saved value", () => {
    expect(parseUnits(null)).toEqual({ system: "imperial", windKnots: false });
    expect(parseUnits('{"system":"metric","windKnots":true}')).toEqual({
      system: "metric",
      windKnots: true,
    });
    expect(parseUnits("not json")).toEqual({ system: "imperial", windKnots: false });
  });
});

describe("parseWindLine", () => {
  it("clamps to (0, 20] and treats empty as none", () => {
    expect(parseWindLine(null)).toBeNull();
    expect(parseWindLine("")).toBeNull();
    expect(parseWindLine("0")).toBeNull();
    expect(parseWindLine("15")).toBe(15);
    expect(parseWindLine("99")).toBe(20); // a personal line above the published limit is capped
  });
});

describe("saved fields", () => {
  const a: SavedField = { lat: 34.45, lon: -116.95, label: "Lucerne Valley" };
  const b: SavedField = { lat: 40.0, lon: -105.0, label: "Boulder" };

  it("parses and filters a stored list", () => {
    expect(parseSaved(JSON.stringify([a, { bad: true }]))).toEqual([a]);
    expect(parseSaved("garbage")).toEqual([]);
  });

  it("adds to the front, de-duped by rounded coordinate", () => {
    const list = addSaved(addSaved([], a), b);
    expect(list.map((f) => f.label)).toEqual(["Boulder", "Lucerne Valley"]);
    const again = addSaved(list, { ...a, label: "Lucerne Valley (ROC)" });
    expect(again).toHaveLength(2);
    expect(again[0].label).toBe("Lucerne Valley (ROC)");
  });

  it("removes by coordinate", () => {
    expect(removeSaved([a, b], a)).toEqual([b]);
  });
});
