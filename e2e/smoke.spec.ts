import { test, expect } from "@playwright/test";
import { installStubs, FIELD_URL } from "./stubs";

test("home loads cleanly and renders the board on stubbed data", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { level: 1, name: "Window" })).toBeVisible();

  // Current conditions render from the fixture (21 mph surface wind).
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await expect(page.getByText("Surface wind").first()).toBeVisible();
  await expect(page.getByText("21").first()).toBeVisible();

  // The 20 mph reference line is stated as a reference, not a verdict.
  await expect(page.getByText(/20 mph/).first()).toBeVisible();

  // The signature panels are present.
  await expect(page.getByRole("heading", { name: "Winds aloft", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The next several days" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("shows the active NWS alert and the observed ceiling", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Wind Advisory" })).toBeVisible();

  // The first station (a RAWS) is skipped; KDAG's observed ceiling is shown.
  const sky = page.locator("#sky");
  await expect(sky.getByText("Observed", { exact: true })).toBeVisible();
  await expect(sky.getByText("Barstow-Daggett Airport")).toBeVisible();
});

test("brand eyebrow links to the Fusion Space hub", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL);
  const eyebrow = page.getByRole("link", { name: "Fusion Space" }).first();
  await expect(eyebrow).toHaveAttribute("href", "https://fusionspace.co");
});

test("privacy page is reachable from the footer", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL);
  await page.getByRole("link", { name: "Privacy" }).first().click();
  await expect(page).toHaveURL(/\/privacy\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});
