import { test, expect, type Page } from "@playwright/test";
import { installStubs } from "./stubs";

// The "My location" button. CI can't reach a real GPS, so the browser's geolocation is mocked:
// a granted position drives the board, and each failure mode produces its own accurate message —
// not the old "permission denied" that was shown for every failure, timeout included.

test("My location populates the board from the device position", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.78, longitude: -119.21 }); // Black Rock, NV
  await installStubs(page);
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "My location" }).click();

  // The field rides into the URL and the board renders for that position.
  await expect(page).toHaveURL(/lat=40\.78/);
  await expect(page).toHaveURL(/lon=-119\.21/);
  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
});

/** Force getCurrentPosition to fail with a given GeolocationPositionError code (1/2/3). */
async function stubGeolocationError(page: Page, code: number) {
  await page.addInitScript((c) => {
    const err = { code: c, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "stub" };
    navigator.geolocation.getCurrentPosition = (_ok: PositionCallback, fail?: PositionErrorCallback | null) => {
      if (fail) fail(err as unknown as GeolocationPositionError);
    };
  }, code);
}

test("a blocked permission points iPhone users at the right setting", async ({ page }) => {
  await stubGeolocationError(page, 1); // PERMISSION_DENIED
  await installStubs(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "My location" }).click();

  const msg = page.getByRole("status").filter({ hasText: "Location is blocked" });
  await expect(msg).toBeVisible();
  await expect(msg).toContainText(/Location Services/);
  await expect(msg).toContainText(/Safari/);
});

test("a timeout reads as a timeout, not a denied permission", async ({ page }) => {
  await stubGeolocationError(page, 3); // TIMEOUT
  await installStubs(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "My location" }).click();

  await expect(page.getByRole("status").filter({ hasText: /took too long/ })).toBeVisible();
  await expect(page.getByText("Location is blocked")).toHaveCount(0);
});

test("an unavailable fix reads as a fix problem", async ({ page }) => {
  await stubGeolocationError(page, 2); // POSITION_UNAVAILABLE
  await installStubs(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "My location" }).click();

  await expect(page.getByRole("status").filter({ hasText: /Couldn.t get a location fix/ })).toBeVisible();
});
