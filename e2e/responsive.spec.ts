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
