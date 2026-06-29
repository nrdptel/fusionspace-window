import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installStubs, FIELD_URL } from "./stubs";

// Automated WCAG 2.0/2.1 A + AA audit of the key surfaces, in both light and dark themes.
// Any violation logs its impact, page, theme, and a sample node before the test fails.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function audit(page: import("@playwright/test").Page, name: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const v of violations) {
    const node = v.nodes[0];
    console.log(
      `\n[${v.impact}] ${name} :: ${v.id} — ${v.help}` +
        `\n  nodes: ${v.nodes.length} | ${(node?.target || []).join(" ")}` +
        `\n  html: ${(node?.html || "").slice(0, 140)}`,
    );
  }
  expect(violations.map((v) => v.id)).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test(`a11y: board with data (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await installStubs(page);
    await page.goto(FIELD_URL, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
    await audit(page, `board/${scheme}`);
  });

  test(`a11y: empty state (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await installStubs(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await audit(page, `empty/${scheme}`);
  });

  test(`a11y: privacy (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await installStubs(page);
    await page.goto("/privacy/", { waitUntil: "networkidle" });
    await audit(page, `privacy/${scheme}`);
  });

  // The default audit can't see content behind a toggle. This opens every disclosure (the
  // methodology sections and each chart's table fallback), reveals the popular-sites picker and
  // the briefing preview, so contrast/ARIA in those reached-but-collapsed states is covered too.
  test(`a11y: expanded interactive state (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await installStubs(page);
    await page.goto(FIELD_URL, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();

    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    await page.getByRole("button", { name: "Sites" }).click();
    await page.getByText("Preview the text briefing").click();
    await expect(page.getByText(/Popular launch sites/)).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Storms" })).toBeVisible();

    await audit(page, `expanded/${scheme}`);
  });
}
