import { expect, test } from "../utils/audit-fixture";

test.describe("mobile navigation", () => {
  test("hamburger opens, closes, and closes after route navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    const navToggle = page.locator('button[aria-controls="mobile-navigation-drawer"]');
    const mobileDrawer = page.locator("#mobile-navigation-drawer");

    await expect(navToggle).toBeVisible();
    await expect(navToggle).toHaveAttribute("aria-expanded", "false");

    await navToggle.click();

    await expect(navToggle).toHaveAttribute("aria-expanded", "true");
    await expect(mobileDrawer.getByRole("link", { name: /^Topics$/ })).toBeVisible();

    await page.getByRole("button", { name: /^Close navigation$/ }).last().click();

    await expect(navToggle).toHaveAttribute("aria-expanded", "false");
    await expect(mobileDrawer.getByRole("link", { name: /^Topics$/ })).toBeHidden();

    await navToggle.click();
    await expect(navToggle).toHaveAttribute("aria-expanded", "true");
    await expect(mobileDrawer.getByRole("link", { name: /^Topics$/ })).toBeVisible();
    await mobileDrawer.getByRole("link", { name: /^Topics$/ }).click();

    await expect(page).toHaveURL(/\/topics$/);
    await expect(navToggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("heading", { name: /choose the areas that deserve attention/i })).toBeVisible();
  });
});
