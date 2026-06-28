import { test, expect } from "@playwright/test";
import { installStubs, FIELD_URL } from "./stubs";

test("NWS down: the board still renders, sky falls back to modeled, no alerts", async ({ page }) => {
  await installStubs(page, { nws: "down" });
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  // Open-Meteo is enough on its own.
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sky & ceiling" })).toBeVisible();

  // The sky panel is the modeled fallback, not an observed ceiling, and there's no alert.
  await expect(page.locator("#sky").getByText("Modeled").first()).toBeVisible();
  // Visibility still appears, filled in from the model rather than a station observation.
  await expect(page.locator("#sky").getByText("Visibility", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wind Advisory" })).toHaveCount(0);
});

test("Open-Meteo down with no cache: a clear, non-error message — not a blank board", async ({ page }) => {
  await installStubs(page, { forecast: "down" });
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  await expect(page.getByText(/Open-Meteo couldn't be reached/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Right now" })).toHaveCount(0);
});
