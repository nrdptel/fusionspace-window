import { describe, it, expect } from "vitest";
import { cacheKey } from "./cache";

describe("cacheKey", () => {
  it("is stable and rounded to three decimals", () => {
    expect(cacheKey(34.45, -116.95)).toBe("window.cache.34.450,-116.950");
    // Points within the rounding window share a key (a reload of the same field hits).
    expect(cacheKey(34.4502, -116.9498)).toBe(cacheKey(34.45, -116.95));
  });

  it("separates distinct fields", () => {
    expect(cacheKey(40.0, -105.0)).not.toBe(cacheKey(34.45, -116.95));
  });
});
