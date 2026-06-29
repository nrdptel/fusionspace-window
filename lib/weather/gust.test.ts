import { describe, it, expect } from "vitest";
import { gustiness } from "./gust";

describe("gustiness", () => {
  it("reads a wide ratio as gusty and a very wide one as very gusty", () => {
    expect(gustiness(21, 29).band).toBe("gusty"); // spread 8 over a strong base
    expect(gustiness(12, 24).band).toBe("very-gusty"); // factor 2.0
  });

  it("trips on a wide absolute spread even when the ratio is modest", () => {
    // 21→29 is only a 1.38 ratio, but an 8 mph spread off the rail is worth flagging.
    const g = gustiness(21, 29);
    expect(g.band).toBe("gusty");
    expect(g.spreadMph).toBe(8);
    expect(g.factor).toBeCloseTo(29 / 21, 3);
    // A 14+ mph spread is very gusty regardless of ratio.
    expect(gustiness(20, 34).band).toBe("very-gusty");
  });

  it("treats a small spread or a steady strong wind as steady", () => {
    expect(gustiness(8, 9).band).toBe("steady"); // 1 mph spread
    expect(gustiness(25, 30).band).toBe("steady"); // spread 5 but factor 1.2, under the line
    expect(gustiness(18, 23).band).toBe("steady"); // spread 5, factor 1.28
  });

  it("does not over-flag light, variable air", () => {
    // A big ratio on a tiny base (3 gusting 9) is light air, not a turbulence hazard.
    expect(gustiness(3, 9).band).toBe("steady");
    expect(gustiness(2, 7).band).toBe("steady");
  });

  it("is steady when there's no gust above the sustained wind, or data is missing", () => {
    expect(gustiness(15, 15).band).toBe("steady");
    expect(gustiness(15, 12).band).toBe("steady"); // gust below sustained (odd data)
    expect(gustiness(NaN, 20).band).toBe("steady");
    expect(gustiness(10, NaN).band).toBe("steady");
  });

  it("carries a tone matching the band and a reason", () => {
    expect(gustiness(8, 9).tone).toBe("emerald");
    expect(gustiness(21, 29).tone).toBe("amber");
    expect(gustiness(12, 24).tone).toBe("red");
    expect(gustiness(21, 29).blurb).toMatch(/off heading/);
  });
});
