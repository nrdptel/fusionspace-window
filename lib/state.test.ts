import { describe, it, expect } from "vitest";
import { decodeState, encodeState } from "./state";

describe("URL state", () => {
  it("round-trips a field through the query string", () => {
    const q = encodeState({ lat: 34.45, lon: -116.95, label: "Lucerne Valley" });
    const s = decodeState(q);
    expect(s.lat).toBe(34.45);
    expect(s.lon).toBe(-116.95);
    expect(s.label).toBe("Lucerne Valley");
  });

  it("rounds coordinates to four decimals", () => {
    const q = encodeState({ lat: 34.4512345, lon: -116.9567891 });
    expect(decodeState(q).lat).toBe(34.4512);
  });

  it("returns nulls for missing or out-of-range coordinates", () => {
    expect(decodeState("")).toMatchObject({ lat: null, lon: null });
    expect(decodeState("?lat=999&lon=0")).toMatchObject({ lat: null, lon: null });
    expect(decodeState("?lat=10")).toMatchObject({ lat: null, lon: null });
  });

  it("accepts a leading question mark", () => {
    expect(decodeState("?lat=40&lon=-105").lat).toBe(40);
  });

  it("clamps an over-long label from the URL and drops control characters", () => {
    const long = "x".repeat(500);
    expect(decodeState(`?lat=40&lon=-105&label=${long}`).label).toHaveLength(80);
    expect(decodeState("?lat=40&lon=-105&label=%09%00clean%1F").label).toBe("clean");
    // A label that's empty after sanitizing becomes undefined, not "".
    expect(decodeState("?lat=40&lon=-105&label=%00%01").label).toBeUndefined();
  });
});
