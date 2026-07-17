import { test, expect } from "@playwright/test";
import { installStubs } from "./stubs";

// The all-sites overview (shown before a field is picked) reads the same-origin conditions feed.
// The default stubs serve an EMPTY feed, so the populated overview is otherwise unexercised. Serve
// a small known feed and check it sorts calmest-first, counts the under-the-line fields, and picks.
const FEED = JSON.stringify({
  schema_version: 1,
  generated_at: "2026-06-27T19:00",
  model: "gfs_seamless",
  count: 3,
  sites: [
    { name: "Windy Field", state: "NV", slug: "windy", lat: 40.5, lon: -119.2, wind_mph: 24, dir_deg: 270, tone: "red" },
    { name: "Calm Field", state: "CA", slug: "calm", lat: 34.45, lon: -116.95, wind_mph: 6, dir_deg: 180, tone: "emerald" },
    { name: "Breezy Field", state: "AZ", slug: "breezy", lat: 33.4, lon: -111.9, wind_mph: 15, dir_deg: 90, tone: "amber" },
  ],
});

test("the all-sites overview sorts calmest-first, counts under the line, and picks a field", async ({ page }) => {
  await installStubs(page);
  await page.route("**/api/v1/conditions.json", (r) => r.fulfill({ contentType: "application/json", body: FEED }));
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByText("Conditions across all sites").click();

  // Count is not-red of total.
  await expect(page.getByText(/2 of 3 under the 20 mph line/)).toBeVisible();

  // Rows are sorted calmest wind first: Calm (6) < Breezy (15) < Windy (24).
  const rows = page.locator("details ul li button");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Calm Field");
  await expect(rows.nth(2)).toContainText("Windy Field");

  // Tapping a row loads that field's board.
  await rows.nth(0).click();
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await expect(page).toHaveURL(/lat=34\.45/);
});
