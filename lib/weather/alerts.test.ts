import { describe, it, expect } from "vitest";
import alertsFixture from "./__fixtures__/nws-alerts.json";
import { parseAlerts, severityTone } from "./alerts";

describe("parseAlerts", () => {
  it("normalises the active alerts", () => {
    const a = parseAlerts(alertsFixture);
    expect(a).toHaveLength(1);
    expect(a[0].event).toBe("Wind Advisory");
    expect(a[0].severity).toBe("Moderate");
    expect(a[0].senderName).toContain("NWS");
    expect(a[0].ends).toBeTruthy();
  });

  it("returns an empty array for no features", () => {
    expect(parseAlerts({ features: [] })).toEqual([]);
    expect(parseAlerts({})).toEqual([]);
  });

  it("sorts most severe first", () => {
    const raw = {
      features: [
        { id: "a", properties: { event: "Minor thing", severity: "Minor" } },
        { id: "b", properties: { event: "Bad thing", severity: "Severe" } },
      ],
    };
    const a = parseAlerts(raw);
    expect(a[0].severity).toBe("Severe");
  });
});

describe("severityTone", () => {
  it("is red for the worst, amber otherwise", () => {
    expect(severityTone("Severe")).toBe("red");
    expect(severityTone("Extreme")).toBe("red");
    expect(severityTone("Moderate")).toBe("amber");
    expect(severityTone("Minor")).toBe("amber");
  });
});
