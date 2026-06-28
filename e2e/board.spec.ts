import { test, expect } from "@playwright/test";
import { installStubs, FIELD_URL } from "./stubs";

test("the units toggle converts in place and never refetches", async ({ page }) => {
  let forecastRequests = 0;
  page.on("request", (r) => {
    if (r.url().includes("api.open-meteo.com/v1/forecast")) forecastRequests += 1;
  });

  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  expect(forecastRequests).toBe(1);

  // Switch to metric — the wind unit becomes km/h, with no new forecast request.
  await page.getByRole("button", { name: "Metric" }).click();
  await expect(page.locator("#now").getByText(/km\/h/).first()).toBeVisible();
  // The 20 mph limit is restated in the active unit, with the canonical mph kept in parens.
  await expect(page.locator("#now").getByText(/km\/h \(20 mph\) limit/)).toBeVisible();
  expect(forecastRequests).toBe(1);

  // Knots is offered for wind specifically.
  await page.getByLabel("Wind in knots").check();
  await expect(page.locator("#now").getByText(/\bkn\b/).first()).toBeVisible();
  expect(forecastRequests).toBe(1);
});

test("the winds-aloft profile has an accessible table fallback with a surface row", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Winds aloft", exact: true })).toBeVisible();

  // The column's mean wind is surfaced with the drift direction.
  await expect(page.locator("#aloft").getByText(/recovery tends to walk/)).toBeVisible();
  // The 0°C freezing level is drawn on the profile (fixture: ~11,800 ft AGL, in view).
  await expect(page.locator("#aloft").getByText("0°C", { exact: true })).toBeVisible();

  await page.getByText("Show the winds-aloft numbers as a table").click();
  await expect(page.getByRole("columnheader", { name: /Altitude AGL/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Surface" })).toBeVisible();
});

test("the fly-time scrubber drives a conditions snapshot", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const hourly = page.locator("#hourly");

  // The snapshot shows the selected hour's decision figures.
  const header = hourly.getByText(/^At /).first();
  await expect(header).toContainText("12 PM"); // the fixture's current hour
  await expect(hourly.getByText("Density altitude")).toBeVisible();
  await expect(hourly.getByText("Storm", { exact: true })).toBeVisible();

  // Scrubbing the slider moves the snapshot to another hour.
  const slider = page.getByRole("slider", { name: /Pick a launch time/ });
  await slider.focus();
  await slider.press("End");
  await expect(header).not.toContainText("12 PM");
});

test("calm windows are surfaced and jump the profile when tapped", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.locator("#hourly").getByText("Calm windows")).toBeVisible();

  // No window is selected at the current (windy) hour; tapping one selects it.
  const chip = page.locator('#hourly button[aria-pressed]').first();
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  // The winds-aloft profile follows the selection.
  await expect(page.locator("#aloft").getByText(/Valid .* field-local/)).toBeVisible();
});

test("the field briefing previews and copies", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  await expect(page.locator("#location").getByText("Take it to the field")).toBeVisible();

  // The preview shows the assembled, honest briefing text.
  await page.getByText("Preview the text briefing").click();
  const preview = page.locator("pre", { hasText: "Window —" });
  await expect(preview).toContainText("Window — Lucerne Valley, CA");
  await expect(preview).toContainText("Surface wind: 21 mph");
  await expect(preview).toContainText("Nearest station (KDAG) observed 15 mph");
  await expect(preview).toContainText("lat=34.45"); // the shareable URL (host varies by env)
  await expect(preview).toContainText("Best-effort, not authoritative");

  // Copying flips the button to a confirmation (clipboard write is handled gracefully).
  const copy = page.getByRole("button", { name: "Copy briefing" });
  await copy.click();
  await expect(page.getByRole("button", { name: /Briefing copied/ })).toBeVisible();
});

test("the outlook shows sunrise and sunset", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.locator("#outlook").getByText(/5:42 AM/)).toBeVisible();
});

test("the outlook sets the week against the seasonal normal", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  // Archive normal ~12 mph; the forecast week averages ~19 (peak 22) → windier than usual.
  const outlook = page.locator("#outlook");
  await expect(outlook.getByText(/Typical max wind for this week here/)).toBeVisible();
  await expect(outlook.getByText(/The next 7 days average .* \(peak/)).toBeVisible();
  await expect(outlook.getByText("windier than usual")).toBeVisible();
});

test("the outlook degrades cleanly when the archive is unreachable", async ({ page }) => {
  await installStubs(page, { archive: "down" });
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "The next several days" })).toBeVisible();
  await expect(page.locator("#outlook").getByText(/Typical max wind/)).toHaveCount(0);
});

test("saved fields show a current-wind glance", async ({ page }) => {
  await installStubs(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      "window.savedFields",
      JSON.stringify([{ lat: 40.78, lon: -119.21, label: "Black Rock, NV" }]),
    );
  });
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  // The saved chip carries the field's current wind (from the stub: 21 mph WSW).
  const chip = page.locator("#location span", { hasText: "Black Rock, NV" }).first();
  await expect(chip).toBeVisible();
  await expect(chip).toContainText(/\d+ [NSEW]/);
});

test("a bare visit returns to the last field", async ({ page }) => {
  await installStubs(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      "window.lastField",
      JSON.stringify({ lat: 34.45, lon: -116.95, label: "Lucerne Valley, CA" }),
    );
  });
  // No field in the URL — a returning flyer should still land on their field.
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  // And the URL is restored so the view stays shareable and reload-proof.
  await expect(page).toHaveURL(/lat=34\.45/);
});

test("the field rides in the URL and survives a reload", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/lat=34\.45/);
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
});
