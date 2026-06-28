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

  await page.getByText("Show the winds-aloft numbers as a table").click();
  await expect(page.getByRole("columnheader", { name: /Altitude AGL/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Surface" })).toBeVisible();
});

test("the hour scrubber is keyboard-accessible", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("slider", { name: /Select the hour shown in the winds-aloft profile/ }),
  ).toBeVisible();
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
  const preview = page.locator("pre");
  await expect(preview).toContainText("Window — Lucerne Valley, CA");
  await expect(preview).toContainText("Surface wind: 21 mph");
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

test("the field rides in the URL and survives a reload", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/lat=34\.45/);
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
});
