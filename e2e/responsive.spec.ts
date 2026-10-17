import { test, expect } from "@playwright/test";
import { installStubs, FIELD_URL } from "./stubs";

// A small mobile-iPhone viewport (390x844, the iPhone 12/13/14 logical width). The board is a
// single deep column on phones, so the regression to guard against is a panel — usually a wide
// chart or a long unbroken string — pushing the whole page wider than the screen and forcing a
// horizontal scroll. Wide elements (the winds-aloft profile, the chart tables) are meant to
// scroll inside their own overflow-x-auto wrappers, never the page. Checked in both themes.
const MOBILE = { width: 390, height: 844 };

for (const scheme of ["light", "dark"] as const) {
  test(`no horizontal overflow on a phone (${scheme})`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.emulateMedia({ colorScheme: scheme });
    await installStubs(page);
    await page.goto(FIELD_URL, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
    // Open the methodology disclosures and the chart table fallbacks too — their content is the
    // most likely to be too wide — so the check covers the expanded states, not just the default.
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    await page.waitForTimeout(200);

    const { scrollW, clientW } = await page.evaluate(() => {
      const d = document.documentElement;
      return { scrollW: d.scrollWidth, clientW: d.clientWidth };
    });
    // Allow 1px for sub-pixel rounding; anything more means a panel is overflowing the phone.
    expect(scrollW, `page is ${scrollW - clientW}px wider than the ${MOBILE.width}px viewport`).toBeLessThanOrEqual(clientW + 1);
  });
}

// The search box's placeholder must show whole, never cut off at the input's edge. On a phone the
// input shares its row with the search icon and the Search button, so it is narrow: measure the
// placeholder in the input's own computed font (canvas measureText) against the input's content
// box, at the narrowest phone we support (320) and the common one (390), in both themes.
for (const scheme of ["light", "dark"] as const) {
  for (const width of [320, 390]) {
    test(`the search placeholder and buttons fit at ${width}px (${scheme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: scheme });
      await installStubs(page);
      await page.goto("/", { waitUntil: "networkidle" });
      const input = page.getByRole("searchbox", { name: "Search for a launch field by place name" });
      await expect(input).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const { placeholder, text, box } = await input.evaluate((el) => {
        const inp = el as HTMLInputElement;
        const cs = getComputedStyle(inp);
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        return {
          placeholder: inp.placeholder,
          text: ctx.measureText(inp.placeholder).width,
          box: inp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        };
      });
      expect(placeholder.length).toBeGreaterThan(0);
      expect(text, `"${placeholder}" is ${text.toFixed(1)}px in a ${box.toFixed(1)}px box`).toBeLessThanOrEqual(box);

      // And the row of buttons beside it stays inside the location card (it wraps instead).
      const card = (await input.locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]").boundingBox())!;
      for (const name of ["My location", "Sites", "Coordinates"]) {
        const b = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
        expect(b.x + b.width, `${name} sticks out of the location card`).toBeLessThanOrEqual(card.x + card.width);
      }
    });
  }
}

// Text boxes that are meant to fit, not scroll: the conditions grid's table fallback, the
// text-briefing preview and the raw METAR. At 320 px their content must sit inside the box at rest,
// so nothing (the Precip column, the long share URL, the METAR's last groups) is left cut off at the
// box's edge waiting to be scrolled to.
for (const scheme of ["light", "dark"] as const) {
  test(`the conditions table, briefing preview and raw METAR fit a 320px phone (${scheme})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ colorScheme: scheme });
    await installStubs(page);
    await page.goto(FIELD_URL, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    await page.evaluate(() => document.fonts.ready);
    for (const box of [
      page.getByLabel("Hourly conditions table"),
      page.locator("pre", { hasText: "Best-effort" }),
      page.getByLabel("Raw METAR report"),
    ]) {
      await expect(box).toBeVisible();
      const { scrollW, clientW } = await box.evaluate((el) => ({ scrollW: el.scrollWidth, clientW: el.clientWidth }));
      expect(scrollW, `content is ${scrollW - clientW}px wider than its ${clientW}px box`).toBeLessThanOrEqual(clientW + 1);
    }
  });
}
