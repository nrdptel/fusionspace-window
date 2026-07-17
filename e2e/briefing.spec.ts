import { test, expect } from "@playwright/test";
import { installStubs, FIELD_URL } from "./stubs";

// The copied field briefing is a user-facing output (it goes into the club chat), so it must stay
// clean — well-formed and free of NaN/undefined/null leaks — both with full data and when the
// best-effort sources (NWS, air quality, archive) are down and lines have to drop out.

async function briefing(page: import("@playwright/test").Page): Promise<string> {
  await page.getByText("Preview the text briefing").click();
  const pre = page.locator("pre").filter({ hasText: /^Window —/ }).first();
  await expect(pre).toBeVisible();
  return pre.innerText();
}

test("the briefing is clean and complete with full data", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const b = await briefing(page);

  expect(b).not.toMatch(/NaN|undefined|\bnull\b/);
  // The decision-relevant lines are all present.
  expect(b).toContain("Surface wind:");
  expect(b).toContain("Storm potential:");
  expect(b).toContain("Mean wind to");
  expect(b).toContain("(observed)"); // station ceiling + visibility present in the full case
});

test("the briefing stays clean when NWS, air quality, and archive are down", async ({ page }) => {
  await installStubs(page, { nws: "down", airQuality: "down", archive: "down" });
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const b = await briefing(page);

  expect(b).not.toMatch(/NaN|undefined|\bnull\b/);
  // Sky/visibility fall back to modeled; the air-quality line drops entirely (no "AQI NaN").
  expect(b).toContain("(modeled)");
  expect(b).not.toContain("Air quality:");
});
