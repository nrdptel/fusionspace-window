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
  await expect(page.getByText(/km\/h/).first()).toBeVisible();
  expect(forecastRequests).toBe(1);

  // Knots is offered for wind specifically.
  await page.getByLabel("Wind in knots").check();
  await expect(page.getByText(/\bkn\b/).first()).toBeVisible();
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

test("the field rides in the URL and survives a reload", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/lat=34\.45/);
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
});
