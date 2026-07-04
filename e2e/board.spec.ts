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

  // The wind steadiness read interprets the gust spread (fixture: 21 gusting 29 → gusty).
  await expect(page.locator("#now").getByText("gusty", { exact: true })).toBeVisible();
  await expect(page.locator("#now").getByText(/off heading at the rail/)).toBeVisible();

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

  // The column's mean wind is surfaced with the drift direction and a downrange drift rate.
  await expect(page.locator("#aloft").getByText(/recovery tends to walk/)).toBeVisible();
  await expect(page.locator("#aloft").getByText(/downrange per minute aloft/)).toBeVisible();
  // The 0°C freezing level is drawn on the profile (fixture: ~11,800 ft AGL, in view).
  await expect(page.locator("#aloft").getByText("0°C", { exact: true })).toBeVisible();

  await page.getByText("Show the winds-aloft numbers as a table").click();
  await expect(page.getByRole("columnheader", { name: /Altitude AGL/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Surface" })).toBeVisible();
});

test("the 0°C line captions why it's absent when out of the shown column", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const aloft = page.locator("#aloft");
  // Default top (20k) shows the line (fixture freezing ≈ 11,800 ft AGL).
  await expect(aloft.getByText("0°C", { exact: true })).toBeVisible();

  // Drop the top to 10k: the line is now above the shown column, so it's replaced by a caption
  // that says the air in view stays above freezing — not an ambiguous blank.
  await aloft.locator("button", { hasText: "10k" }).click();
  await expect(aloft.getByText("0°C", { exact: true })).toHaveCount(0);
  await expect(aloft.getByText(/0°C is above the shown column/)).toBeVisible();
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

  // Scrubbing the slider moves the snapshot to another hour. Each scrub panel now has its own
  // synced fly-time slider, so scope to the hourly panel's.
  const slider = hourly.getByRole("slider", { name: /Pick a launch time/ });
  await slider.focus();
  await slider.press("End");
  await expect(header).not.toContainText("12 PM");
});

test("the low-cloud timeline shares the fly-time in both directions", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const sky = page.locator("#sky");

  // The low-cloud outlook is a full timeline with its own scrubber, reading the selected launch
  // hour. At the default selection that's the fixture's current hour.
  const flyRead = sky.getByText(/At your fly-time/);
  await expect(flyRead).toContainText("12 PM");

  // Scrubbing the hourly panel's slider moves the sky read too (one selection across the board).
  const hourlySlider = page.locator("#hourly").getByRole("slider", { name: /Pick a launch time/ });
  await hourlySlider.focus();
  await hourlySlider.press("End");
  await expect(flyRead).not.toContainText("12 PM");

  // And the reverse: the sky panel's own slider drives the rest of the board.
  const skySlider = sky.getByRole("slider", { name: /Pick a launch time/ });
  await skySlider.focus();
  await skySlider.press("Home");
  await expect(flyRead).toContainText("12 PM");
  await expect(page.locator("#hourly").getByText(/^At /).first()).toContainText("12 PM");
});

test("no fly-time-driven panel changes height as you scrub (mobile)", async ({ page }) => {
  // Guards against the class of bug where a reading wraps 1↔2 lines as the fly-time changes and
  // jumps the card (and the page) up and down. Every panel bound to the shared fly-time must keep
  // a constant height across the whole scrub. Apogee + descent rate are set so the value-driven
  // prose (the drift landing line, the ceiling-clearance read) is present and exercised.
  await page.setViewportSize({ width: 393, height: 900 });
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await page.getByLabel(/Expected apogee/).fill("9000");
  await page.getByLabel(/Recovery descent rate/).fill("18");

  const slider = page.locator("#hourly").getByRole("slider", { name: /Pick a launch time/ });
  await slider.focus();
  const heights: Record<string, Set<number>> = { hourly: new Set(), conditions: new Set(), aloft: new Set(), sky: new Set() };
  for (const k of [0, 9, 18, 27, 36, 45, 54, 63, 71]) {
    await slider.evaluate((el: HTMLInputElement, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, k);
    await page.waitForTimeout(20);
    for (const id of Object.keys(heights)) {
      const b = await page.locator(`#${id}`).boundingBox();
      if (b) heights[id].add(Math.round(b.height));
    }
  }
  for (const [id, set] of Object.entries(heights)) {
    expect(set.size, `#${id} height varied across the scrub: ${[...set].join(",")}`).toBe(1);
  }
});

test("the conditions grid stacks the factor rows and lists them in a table", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const grid = page.locator("#conditions");
  await expect(grid.getByRole("heading", { name: "Conditions at a glance" })).toBeVisible();

  // Four factors, stacked as labelled rows (the labels are a fixed column beside the scrolling grid;
  // .first() picks that column over the identically-named headers in the collapsed table fallback).
  for (const label of ["Wind", "Gusts", "Storms", "Precip"]) {
    await expect(grid.getByText(label, { exact: true }).first()).toBeVisible();
  }
  // The colour key is present; there is deliberately no single blended verdict.
  await expect(grid.getByText("caution", { exact: true })).toBeVisible();

  // The table fallback carries the underlying per-hour statuses (fixture noon: 21 gusting 29 → gusty).
  await grid.getByText("Show the conditions grid as a table").click();
  await expect(grid.getByRole("columnheader", { name: "Storms" })).toBeVisible();
  await expect(grid.getByRole("cell", { name: "Gusty" }).first()).toBeVisible();
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
  // Headlined on the day's CAPE peak (1,700 → moderate), matching the on-screen storm panel.
  await expect(preview).toContainText("Storm potential: Moderately unstable");
  await expect(preview).toContainText("0°C level:");
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

test("the outlook shows each day's calmest flyable window", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const outlook = page.locator("#outlook");
  // At least one day surfaces a compact calm-window range (fixture today/tomorrow: ~2p–7p).
  await expect(outlook.getByText(/\d{1,2}[ap]\s*[–-]\s*\d{1,2}[ap]/).first()).toBeVisible();
  // The source line explains the green line and reads the limit cleanly (no "mphlimit").
  await expect(outlook.getByText(/calmest daylight stretch/)).toBeVisible();
  await expect(outlook.getByText(/crosses the 20 mph limit/)).toBeVisible();
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

test("the air-quality panel shows the AQI and smoke, and degrades cleanly", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  const air = page.locator("#air");
  await expect(air.getByRole("heading", { name: /Air quality/ })).toBeVisible();
  await expect(air.getByText("78")).toBeVisible(); // fixture US AQI
  await expect(air.getByText("Moderate")).toBeVisible();
  await expect(air.getByText(/PM2\.5 \(smoke\)/)).toBeVisible();
});

test("the air-quality panel is simply absent when the source is unreachable", async ({ page }) => {
  await installStubs(page, { airQuality: "down" });
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await expect(page.locator("#air")).toHaveCount(0);
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

test("launch sites are grouped by state as one-tap starting points", async ({ page }) => {
  await installStubs(page);
  await page.goto("/", { waitUntil: "networkidle" }); // empty state, no field in the URL

  await page.getByRole("button", { name: "Sites" }).click();
  await expect(page.getByText(/Launch sites by state/)).toBeVisible();
  await expect(page.getByText(/approximate/)).toBeVisible(); // honest labelling

  // The individual sites are hidden until a state is chosen; pick a state, then its site.
  await expect(page.getByRole("button", { name: /Black Rock Desert/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^Nevada/ }).click();
  await page.getByRole("button", { name: /Black Rock Desert/ }).click();

  // The chosen site loads the board and rides into the shareable URL.
  await expect(page).toHaveURL(/lat=40\.87/);
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
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
