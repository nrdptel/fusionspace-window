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

  // The barometer is falling in the fixture, surfaced as a pressure tendency.
  await expect(nowPanel.getByText("Pressure", { exact: true })).toBeVisible();
  await expect(nowPanel.getByText(/Falling .* hPa\/3h/)).toBeVisible();

  // Dew point and the temperature spread are derived and shown.
  await expect(nowPanel.getByText("Dew point", { exact: true })).toBeVisible();
  await expect(nowPanel.getByText(/spread — (dry air|humid|near saturation)/)).toBeVisible();
});

test("shows the modeled low-cloud outlook as the forward-looking companion to the ceiling", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  const sky = page.locator("#sky");
  await expect(sky.getByText("Low cloud · next 3 days")).toBeVisible();
  // The fixture is thin now and builds to an 85% overcast deck by midday tomorrow.
  await expect(sky.getByText(/Thin now, building to overcast \(85%\) by Tomorrow 12 PM/)).toBeVisible();
  // It's labeled modeled — the observed ceiling keeps the go/no-go, this is a heads-up.
  await expect(sky.getByText(/Modeled low-cloud cover from Open-Meteo/)).toBeVisible();
});

test("surfaces observed present weather (a thunderstorm) from the nearest METAR as a no-go", async ({ page }) => {
  await installStubs(page, { observations: "thunderstorm" });
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  const sky = page.locator("#sky");
  await expect(sky.getByText("Thunderstorm, Light rain")).toBeVisible();
  await expect(sky.getByText(/observed now — a launch no-go/)).toBeVisible();

  // It rides into the shareable briefing too.
  await page.getByText("Preview the text briefing").click();
  await expect(page.getByText(/Observed now: Thunderstorm, Light rain — launch no-go/)).toBeVisible();
});

test("reads the observed ceiling against an expected apogee as a go/no-go gate", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  const sky = page.locator("#sky");
  const apogee = page.getByLabel(/Expected apogee/);

  // With no apogee set, the clearance line is absent — the ceiling is just a number.
  await expect(sky.getByText(/of room below your/)).toHaveCount(0);

  // The fixture ceiling is BKN ~6,496 ft. A 9,000 ft peak flies into the deck → No-go.
  await apogee.fill("9000");
  await expect(sky.getByText("No-go", { exact: true })).toBeVisible();
  await expect(sky.getByText(/into the deck/)).toBeVisible();

  // A 2,000 ft peak clears it comfortably → Clear.
  await apogee.fill("2000");
  await expect(sky.getByText("Clear", { exact: true })).toBeVisible();
  await expect(sky.getByText(/of room below your 2,000 ft peak/)).toBeVisible();

  // Clearing the field removes the read again.
  await apogee.fill("");
  await expect(sky.getByText(/of room below your/)).toHaveCount(0);
});

test("turns the mean wind aloft into a landing-drift distance from a descent rate", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  const aloft = page.locator("#aloft");
  // Default: the per-minute drift rate and a prompt to set a descent rate.
  await expect(aloft.getByText(/per minute aloft/)).toBeVisible();
  await expect(aloft.getByText(/set a descent rate/)).toBeVisible();

  // A descent rate alone gives the per-1,000-ft ratio. Scope to the drogue field's unique
  // aria-label — in dual mode the Main-rate field also matches a bare /descent rate/.
  await page.getByLabel(/Recovery descent rate/i).fill("18");
  await expect(aloft.getByText(/of drift per 1,000 ft of descent/)).toBeVisible();

  // Add an apogee and it becomes an actual landing distance toward a compass point.
  await page.getByLabel(/Expected apogee/).fill("9000");
  await expect(aloft.getByText(/from your .* apogee, about/)).toBeVisible();
  await expect(aloft.getByText(/single-rate estimate/)).toBeVisible();
});

test("splits the landing drift between drogue and main in dual-deploy mode", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL, { waitUntil: "networkidle" });

  const aloft = page.locator("#aloft");

  // Set an apogee and the (drogue) descent rate, then switch to dual deploy. Scope the rate
  // selector to the drogue field's unique aria-label so it stays unambiguous after the toggle.
  await page.getByLabel(/Expected apogee/).fill("9000");
  await page.getByLabel(/Recovery descent rate/i).fill("50");
  await page.getByRole("group", { name: "Recovery mode" }).getByRole("button", { name: "Dual" }).click();

  // Until the main-deploy altitude and main rate are set, the panel prompts for them.
  await expect(aloft.getByText(/dual-deploy landing-drift estimate/)).toBeVisible();

  await page.getByLabel(/Main-chute deploy altitude/).fill("700");
  await page.getByLabel(/Main-parachute descent rate/).fill("18");

  // Now the two-phase estimate renders, with the drogue and main legs broken out.
  await expect(aloft.getByText(/Dual deploy — drogue at 50 ft\/s/)).toBeVisible();
  await expect(aloft.getByText(/drogue leg ~/)).toBeVisible();
  await expect(aloft.getByText(/main leg ~/)).toBeVisible();

  // It rides into the shareable briefing as a dual-deploy landing-drift line.
  await page.getByText("Preview the text briefing").click();
  await expect(page.getByText(/Landing drift \(dual\):/)).toBeVisible();
});

test("brand eyebrow links to the Fusion Space hub", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL);
  const eyebrow = page.getByRole("link", { name: "Fusion Space" }).first();
  await expect(eyebrow).toHaveAttribute("href", "https://fusionspace.co");
});

test("footer cross-links to the live sibling tools (inline, no Debrief)", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL);
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Motor Finder" })).toHaveAttribute("href", "https://motor.fusionspace.co");
  await expect(footer.getByRole("link", { name: "Charge" })).toHaveAttribute("href", "https://charge.fusionspace.co");
  // Debrief is still in development — a launch-ready tool doesn't link it.
  await expect(footer.getByRole("link", { name: "Debrief" })).toHaveCount(0);
});

test("privacy page is reachable from the footer", async ({ page }) => {
  await installStubs(page);
  await page.goto(FIELD_URL);
  await page.getByRole("link", { name: "Privacy" }).first().click();
  await expect(page).toHaveURL(/\/privacy\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});
