import { test, expect } from "@playwright/test";
import { installStubs } from "./stubs";

// The all-sites overview reads the same-origin static feed (public/api/v1/conditions.json). Stub it with a
// small sample so the test doesn't depend on the build-time fetch having populated real data.
const sample = {
  schema_version: 1,
  generated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  model: "gfs_seamless",
  count: 3,
  sites: [
    { name: "SEARS — Samson", state: "AL", lat: 31.13, lon: -86.07, wind_mph: 7, gust_mph: 11, dir_deg: 270, temp_f: 72, tone: "emerald" },
    { name: "HARA — Woodville", state: "AL", lat: 34.63, lon: -86.32, wind_mph: 16, gust_mph: 22, dir_deg: 200, temp_f: 68, tone: "amber" },
    { name: "Black Rock Desert — Gerlach", state: "NV", lat: 40.87, lon: -119.11, wind_mph: 24, gust_mph: 30, dir_deg: 300, temp_f: 80, tone: "red" },
  ],
};

test("all-sites overview renders from the static feed and loads a field", async ({ page }) => {
  await installStubs(page);
  await page.route("**/api/v1/conditions.json", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify(sample) }),
  );
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByText("Conditions across all sites").click();

  // 2 of 3 under the 20 mph line; calmest first, windiest last.
  await expect(page.getByText(/2 of 3 under the 20 mph line/)).toBeVisible();
  const rows = page.locator("details ul li button");
  await expect(rows.first()).toContainText("SEARS — Samson");
  await expect(rows.last()).toContainText("Black Rock Desert");

  // Tapping a site loads its board.
  await rows.first().click();
  await expect(page).toHaveURL(/lat=31\.13/);
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
});

test("the overview is absent when the feed is empty", async ({ page }) => {
  await installStubs(page);
  await page.route("**/api/v1/conditions.json", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ schema_version: 1, generated_at: null, model: "gfs_seamless", count: 0, sites: [] }) }),
  );
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByText("Conditions across all sites")).toHaveCount(0);
});
