import { expect, test } from "@playwright/test";

test.describe("V1 shell and routing", () => {
  test.describe.configure({ mode: "serial" });

  test("renders the Home / History / Account shell on desktop", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /today's briefing/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Top Events" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Home$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^History$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Account$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Today$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Topics$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Sources$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Settings$/ })).toHaveCount(0);
  });

  test("redirects the legacy dashboard route to Home", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /today's briefing/i })).toBeVisible();
  });

  test("uses bottom tab navigation on mobile instead of a drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator('button[aria-controls="mobile-navigation-drawer"]')).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Home$/ }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: /^History$/ }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Account$/ }).last()).toBeVisible();

    await page.getByRole("link", { name: /^History$/ }).last().click();

    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByText(/Sign in to view briefing history/i)).toBeVisible();
  });

  test("opens the shared briefing detail route from Home", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const detailLink = page.getByRole("link", { name: "Open full briefing" });
    const href = await detailLink.getAttribute("href");
    expect(href).toMatch(/^\/briefing\/\d{4}-\d{2}-\d{2}$/);

    await detailLink.click();

    await expect(page).toHaveURL(/\/briefing\/\d{4}-\d{2}-\d{2}$/, { timeout: 20_000 });
    await expect(page.getByRole("tab", { name: "Top Events" })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to history/i })).toBeVisible();
  });

  test("redirects signed-out Account access to login with redirectTo", async ({ page }) => {
    await page.goto("/account", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL((url) => {
      return url.pathname === "/login" && url.searchParams.get("redirectTo") === "/account";
    }, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
