import { describe, it, expect } from "vitest";
import { observancesForDate, type Observance } from "./observances";

// The observances are hand-curated flourishes shown per calendar month, each pointing at a real
// public resource. This is a data-integrity guard: it can't judge taste, but it locks the shape
// every entry must keep — a stable id, a real message, and (when present) a well-formed https link
// with a visible label and a complete accent bar. It also asserts the wiring: every month resolves,
// and the lookup is keyed on the date's own month.

// Gather one representative date per month (mid-month avoids any timezone edge at a boundary).
const MONTHS = Array.from({ length: 12 }, (_, m) => new Date(2026, m, 15));

function allObservances(): Observance[] {
  return MONTHS.flatMap((d) => observancesForDate(d));
}

describe("observancesForDate", () => {
  it("resolves a non-empty list for every month of the year", () => {
    for (const d of MONTHS) {
      const list = observancesForDate(d);
      expect(Array.isArray(list), `month ${d.getMonth()}`).toBe(true);
      expect(list.length, `month ${d.getMonth()} has no observance`).toBeGreaterThan(0);
    }
  });

  it("keys the lookup on the date's own month", () => {
    // A March date must return March's set, not some fixed month — guards against a hardcoded index.
    const march = observancesForDate(new Date(2026, 2, 15));
    expect(march.some((o) => o.id === "womens-history")).toBe(true);
    const june = observancesForDate(new Date(2026, 5, 15));
    expect(june.some((o) => o.id === "pride")).toBe(true);
    expect(june.some((o) => o.id === "womens-history")).toBe(false);
  });

  it("defaults to the current month when called with no argument", () => {
    const now = new Date();
    expect(observancesForDate()).toEqual(observancesForDate(now));
  });

  it("gives every observance a stable id and a real message", () => {
    for (const o of allObservances()) {
      expect(o.id.trim().length, JSON.stringify(o)).toBeGreaterThan(0);
      expect(o.message.trim().length, o.id).toBeGreaterThan(0);
    }
  });

  it("uses a unique id for every observance across the whole year", () => {
    const ids = allObservances().map((o) => o.id);
    expect(new Set(ids).size, `duplicate id in ${JSON.stringify(ids)}`).toBe(ids.length);
  });

  it("pairs every link with a visible label and a well-formed https URL", () => {
    for (const o of allObservances()) {
      if (o.href === undefined) {
        // A link without a label (or vice-versa) would render a bare or dead arrow.
        expect(o.hrefLabel, `${o.id} has a label but no href`).toBeUndefined();
        continue;
      }
      expect(o.hrefLabel?.trim().length, `${o.id} has a href but no label`).toBeGreaterThan(0);
      let url: URL | undefined;
      expect(() => {
        url = new URL(o.href as string);
      }, `${o.id} href is not a valid URL: ${o.href}`).not.toThrow();
      expect(url?.protocol, `${o.id} href is not https`).toBe("https:");
    }
  });

  it("gives every accent bar both a background and a title", () => {
    for (const o of allObservances()) {
      if (!o.bar) continue;
      expect(o.bar.background.trim().length, `${o.id} bar has no background`).toBeGreaterThan(0);
      expect(o.bar.title.trim().length, `${o.id} bar has no title`).toBeGreaterThan(0);
    }
  });
});
