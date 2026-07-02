import { describe, it, expect } from "vitest";
import { LAUNCH_SITES, US_STATE_NAMES, sitesByState } from "./launchSites";

// These are hand-curated coordinates, so the test is a typo guard: every entry must be a named
// US-continental point in a known state, and no two may collide.
describe("LAUNCH_SITES", () => {
  it("offers a broad set of named sites", () => {
    expect(LAUNCH_SITES.length).toBeGreaterThanOrEqual(40);
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

  it("tags every site with a known two-letter state", () => {
    for (const s of LAUNCH_SITES) {
      expect(US_STATE_NAMES[s.state], s.name).toBeTruthy();
      expect(s.state, s.name).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("has unique names and distinct coordinates", () => {
    const names = LAUNCH_SITES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    const coords = LAUNCH_SITES.map((s) => `${s.lat.toFixed(2)},${s.lon.toFixed(2)}`);
    expect(new Set(coords).size).toBe(coords.length);
  });
});

describe("sitesByState", () => {
  it("groups every site under its state with nothing lost or duplicated", () => {
    const groups = sitesByState();
    const total = groups.reduce((n, g) => n + g.sites.length, 0);
    expect(total).toBe(LAUNCH_SITES.length);
    // Every group's sites all belong to that state.
    for (const g of groups) {
      for (const s of g.sites) expect(s.state).toBe(g.state);
    }
  });

  it("sorts states by full name and sites by name within each", () => {
    const groups = sitesByState();
    const stateNames = groups.map((g) => g.name);
    expect(stateNames).toEqual([...stateNames].sort((a, b) => a.localeCompare(b)));
    for (const g of groups) {
      const names = g.sites.map((s) => s.name);
      expect(names, g.state).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });

  it("covers a wide spread of states", () => {
    expect(sitesByState().length).toBeGreaterThanOrEqual(25);
  });
});
