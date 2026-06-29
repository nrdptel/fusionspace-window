import { describe, it, expect } from "vitest";
import { LAUNCH_SITES } from "./launchSites";

// These are hand-curated coordinates, so the test is a typo guard: every entry must be a named
// US-continental point, and no two may collide.
describe("LAUNCH_SITES", () => {
  it("offers a non-trivial set of named sites", () => {
    expect(LAUNCH_SITES.length).toBeGreaterThanOrEqual(6);
    for (const s of LAUNCH_SITES) {
      expect(s.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("places every site within the continental US bounds", () => {
    for (const s of LAUNCH_SITES) {
      expect(s.lat, s.name).toBeGreaterThan(24);
      expect(s.lat, s.name).toBeLessThan(49);
      expect(s.lon, s.name).toBeGreaterThan(-125);
      expect(s.lon, s.name).toBeLessThan(-66);
    }
  });

  it("has unique names and distinct coordinates", () => {
    const names = LAUNCH_SITES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    const coords = LAUNCH_SITES.map((s) => `${s.lat.toFixed(2)},${s.lon.toFixed(2)}`);
    expect(new Set(coords).size).toBe(coords.length);
  });
});
