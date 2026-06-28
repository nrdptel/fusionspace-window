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
  await expect(page.locator("#now").getByText("Surface wind", { exact: true })).toBeVisible();
  await expect(page.locator("#now")).toContainText("21");

  // The 20 mph reference line is stated as a reference, not a verdict.
  await expect(page.getByText(/20 mph/).first()).toBeVisible();

  // Density altitude is derived and shown under "Right now" (~5,000 ft for the fixture).
  await expect(page.locator("#now").getByText("Density altitude")).toBeVisible();
  await expect(page.locator("#now").getByText(/5,0\d{2}/).first()).toBeVisible();

  // Storm potential (CAPE) is surfaced as its own panel.
  await expect(page.getByRole("heading", { name: "Storm potential", exact: true })).toBeVisible();
  await expect(page.locator("#storms").getByText(/CAPE now 900 J\/kg/)).toBeVisible();
  await expect(page.locator("#storms").getByText(/Moderately unstable/)).toBeVisible();

  // The signature panels are present, including the wind-shear callout.
  await expect(page.getByRole("heading", { name: "Winds aloft", exact: true })).toBeVisible();
  await expect(page.locator("#aloft").getByText(/Strongest layer/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "The next several days" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("shows the active NWS alert and the observed ceiling", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Wind Advisory" })).toBeVisible();

  // The first station (a RAWS) is skipped; KDAG's observed ceiling is shown.
  const sky = page.locator("#sky");
  await expect(sky.getByText("Barstow-Daggett Airport")).toBeVisible();
  // Both the ceiling and the observed visibility carry the "Observed" tag.
  await expect(sky.getByText("Observed", { exact: true })).toHaveCount(2);
  // The observed visibility (10 mi) is surfaced beside the ceiling.
  await expect(sky.getByText("Visibility", { exact: true })).toBeVisible();
  await expect(sky.getByText("mi", { exact: true })).toBeVisible();

  // The raw METAR is available behind a disclosure.
  await sky.getByText("Show the raw report (METAR)").click();
  await expect(sky.getByText(/KDAG 271953Z/)).toBeVisible();

  // "Right now" cross-checks the model wind against the station's observed reading.
  const nowPanel = page.locator("#now");
  await expect(nowPanel.getByText("Nearest station")).toBeVisible();
  await expect(nowPanel.getByText(/Observed at KDAG/)).toBeVisible();
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
