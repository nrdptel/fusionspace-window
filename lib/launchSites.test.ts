import { describe, it, expect } from "vitest";
import { LAUNCH_SITES, US_STATE_NAMES, sitesByState } from "./launchSites";

// Deliberately GENEROUS per-state bounding boxes (state extent + ~0.3–0.5° margin): a typo guard,
// not a precise geofence. They exist to catch the errors a whole-US box can't — a flipped sign, a
// transposed digit, or a site tagged to the wrong state — while still accepting a real field that
// sits right on a state line. [lat_min, lat_max, lon_min, lon_max].
const STATE_BOUNDS: Record<string, [number, number, number, number]> = {
  AL: [30.1, 35.1, -88.6, -84.8], AK: [51, 72, -170, -129], AZ: [31.2, 37.1, -114.9, -108.9],
  AR: [32.9, 36.6, -94.7, -89.5], CA: [32.4, 42.1, -124.5, -114.0], CO: [36.9, 41.1, -109.2, -101.9],
  CT: [40.9, 42.1, -73.8, -71.7], DE: [38.4, 39.9, -75.8, -74.9], FL: [24.3, 31.1, -87.7, -79.9],
  GA: [30.3, 35.1, -85.7, -80.8], HI: [18.8, 22.3, -160.3, -154.7], ID: [41.9, 49.1, -117.3, -110.9],
  IL: [36.9, 42.6, -91.6, -87.4], IN: [37.7, 41.8, -88.2, -84.7], IA: [40.3, 43.6, -96.7, -90.0],
  KS: [36.9, 40.1, -102.1, -94.5], KY: [36.4, 39.2, -89.7, -81.8], LA: [28.8, 33.1, -94.1, -88.7],
  ME: [42.9, 47.6, -71.2, -66.8], MD: [37.8, 39.8, -79.6, -75.0], MA: [41.1, 42.9, -73.6, -69.8],
  MI: [41.6, 48.4, -90.5, -82.3], MN: [43.4, 49.5, -97.3, -89.4], MS: [30.1, 35.1, -91.8, -88.0],
  MO: [35.9, 40.7, -95.9, -89.0], MT: [44.3, 49.1, -116.2, -103.9], NE: [39.9, 43.1, -104.2, -95.2],
  NV: [34.9, 42.1, -120.1, -113.9], NH: [42.6, 45.4, -72.6, -70.5], NJ: [38.8, 41.4, -75.6, -73.8],
  NM: [31.2, 37.1, -109.2, -102.9], NY: [40.4, 45.1, -79.9, -71.8], NC: [33.7, 36.7, -84.4, -75.4],
  ND: [45.8, 49.1, -104.2, -96.5], OH: [38.3, 42.4, -84.9, -80.4], OK: [33.5, 37.1, -103.1, -94.4],
  OR: [41.9, 46.4, -124.7, -116.4], PA: [39.6, 42.4, -80.6, -74.6], RI: [41.1, 42.1, -71.9, -71.1],
  SC: [31.9, 35.3, -83.5, -78.4], SD: [42.4, 46.0, -104.2, -96.3], TN: [34.9, 36.8, -90.4, -81.5],
  TX: [25.7, 36.6, -106.8, -93.4], UT: [36.9, 42.1, -114.1, -108.9], VT: [42.6, 45.1, -73.5, -71.4],
  VA: [36.4, 39.6, -83.8, -75.1], WA: [45.4, 49.1, -124.9, -116.8], WV: [37.1, 40.7, -82.7, -77.6],
  WI: [42.4, 47.2, -92.9, -86.7], WY: [40.9, 45.1, -111.2, -103.9],
};

// These are hand-curated coordinates, so the test is a typo guard: every entry must be a named
// US-continental point in a known state, and no two may collide.
describe("LAUNCH_SITES", () => {
  it("offers a broad set of named sites", () => {
    expect(LAUNCH_SITES.length).toBeGreaterThanOrEqual(40);
    for (const s of LAUNCH_SITES) {
      expect(s.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("places every site inside its stated state's bounds (catches a wrong-state coordinate)", () => {
    for (const s of LAUNCH_SITES) {
      const box = STATE_BOUNDS[s.state];
      expect(box, `no bounding box for state ${s.state} (${s.name})`).toBeTruthy();
      const [latMin, latMax, lonMin, lonMax] = box;
      const inside = s.lat >= latMin && s.lat <= latMax && s.lon >= lonMin && s.lon <= lonMax;
      expect(inside, `${s.name}: (${s.lat}, ${s.lon}) is outside ${s.state} ${JSON.stringify(box)}`).toBe(true);
    }
  });

  it("has a bounding box for every state code the data uses", () => {
    for (const state of new Set(LAUNCH_SITES.map((s) => s.state))) {
      expect(STATE_BOUNDS[state], `add a STATE_BOUNDS entry for ${state}`).toBeTruthy();
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
