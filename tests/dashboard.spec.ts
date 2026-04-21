import { expect, test } from "@playwright/test";

test.describe("dashboard", () => {
  test("renders the signed-out dashboard smoke state", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveTitle(/today's briefing/i);
    await expect(page.getByRole("heading", { name: /today's public briefing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what signing in unlocks/i })).toBeVisible();
    await expect(page.getByText(/preview the ranked public briefing here, then sign in/i)).toBeVisible();
  });

  test("keeps the signed-out dashboard truth after refresh", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /today's public briefing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what signing in unlocks/i })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: /today's public briefing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what signing in unlocks/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /unlock full briefing/i })).toBeVisible();
  });

  test("renders the capped signal briefing with visible tier labels", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /today's signal briefing/i })).toBeVisible();
    await expect(page.getByText(/the dashboard renders at most five ranked signals/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /core signals/i })).toBeVisible();
    const tierBadges = page.locator("span").filter({ hasText: /^(Core Signal|Context Signal)$/ });
    await expect(tierBadges.first()).toBeVisible();
    expect(await tierBadges.count()).toBeLessThanOrEqual(5);
  });

  test("returns provider callback errors to the homepage callback-error state", async ({ page }) => {
    await page.goto(
      "/auth/callback?error=access_denied&error_code=otp_expired&error_description=User%20denied%20access",
    );

    await expect(page).toHaveURL(/\/\?auth=callback-error$/);
    await expect(
      page.getByRole("heading", { name: /continue to daily intelligence/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("alert").getByText(/sign-in callback could not be completed/i),
    ).toBeVisible();
  });

  test("toggles the mobile navigation drawer and closes it on outside click or route change", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /today's public briefing/i })).toBeVisible();
    const navToggle = page.locator('button[aria-controls="mobile-navigation-drawer"]');
    const mobileDrawer = page.locator("#mobile-navigation-drawer");
    await expect(navToggle).toBeVisible();
    await expect(navToggle).toHaveAttribute("aria-expanded", "false");

    await navToggle.click();

    await expect(navToggle).toHaveAttribute("aria-expanded", "true");
    await expect(mobileDrawer.getByRole("link", { name: /^Topics$/ })).toBeVisible();

    await page.mouse.click(370, 120);

    await expect(mobileDrawer.getByRole("link", { name: /^Topics$/ })).toBeHidden();
    await expect(navToggle).toHaveAttribute("aria-expanded", "false");

    await navToggle.click();
    await expect(navToggle).toHaveAttribute("aria-expanded", "true");
    await expect(mobileDrawer.getByRole("link", { name: /^Topics$/ })).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => url.pathname === "/topics"),
      mobileDrawer.getByRole("link", { name: /^Topics$/ }).click(),
    ]);

    await expect(page).toHaveURL(/\/topics$/);
    await expect(navToggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("heading", { name: /choose the areas that deserve attention/i })).toBeVisible();
  });

  test("keeps the mobile drawer hidden on desktop viewports", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator('button[aria-controls="mobile-navigation-drawer"]')).toBeHidden();
    await expect(page.getByRole("link", { name: /^Today$/ })).toBeVisible();
  });
});
