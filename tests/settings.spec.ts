import { expect, test } from "@playwright/test";

test.describe("settings shell cleanup", () => {
  test("shows honest placeholder states for unfinished settings sections", async ({ page }) => {
    await page.goto("/settings");

    await expect(page).toHaveTitle(/settings/i);
    await expect(page.getByText(/profile editing and account identity sync are still in development/i)).toBeVisible();
    await expect(page.getByText(/delivery timing, digest scheduling, and reminder controls are not wired up yet/i)).toBeVisible();
    await expect(page.getByText(/session history, device management, and broader security controls are planned/i)).toBeVisible();
    await expect(page.getByText(/export, deletion, and account-level data controls need backend support/i)).toBeVisible();
    await expect(page.getByText(/These profile controls are intentionally hidden for now/i)).toBeVisible();
    await expect(page.getByText(/We removed inactive toggles here so the page no longer implies email or refresh automation is live today/i)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /display name/i })).toHaveCount(0);
  });

  test("sets honest expectations for unfinished source management controls", async ({ page }) => {
    await page.goto("/sources");

    await expect(page.getByRole("heading", { name: /track the feeds that matter/i })).toBeVisible();
    await expect(page.getByText(/source pause or resume actions, feed editing, and source health controls are still in development/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /add an rss source/i })).toBeVisible();
  });
});
