import { expect, test } from "@playwright/test";

function isAccountAuthGateUrl(url: URL) {
  return (
    url.pathname === "/account" ||
    (url.pathname === "/login" && url.searchParams.get("redirectTo") === "/account")
  );
}

const fallbackBriefingCopy =
  /Showing the most recently published briefing\.|The latest briefing is not yet available\. Please check back soon\./;

test.describe("V1 shell and routing", () => {
  test.describe.configure({ mode: "serial" });

  test("renders the Home / History / Account shell on desktop", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Today's signals" })).toBeVisible();
    await expect(page.getByText("For people who want to understand the world, not just consume it.").first()).toBeVisible();
    await expect(page.getByText("Browse by")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tech" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finance" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Politics" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Home$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^History$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Account$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Signals$/ }).first()).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Today$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Topics$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Sources$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Settings$/ })).toHaveCount(0);
  });

  test("redirects the legacy dashboard route to Home", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Today's signals" })).toBeVisible();
    await expect(page.getByText("Browse by")).toHaveCount(0);
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

    const detailLink = page.getByRole("link", { name: "Read more →" }).first();
    if (!(await detailLink.isVisible())) {
      await expect(page.getByText(fallbackBriefingCopy).first()).toBeVisible();
      await expect(page.getByText(/stored public signal snapshot|placeholder:|sample slot|fallback rail/i)).toHaveCount(0);
      return;
    }

    const href = await detailLink.getAttribute("href");
    expect(href).toMatch(/^\/briefing\/\d{4}-\d{2}-\d{2}$/);

    await expect(detailLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/briefing\/\d{4}-\d{2}-\d{2}$/, { timeout: 20_000 }),
      detailLink.click(),
    ]);
    await expect(page.getByText("Today's signals").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to history/i })).toBeVisible();
  });

  test("redirects signed-out Account access to login with redirectTo", async ({ page }) => {
    await page.goto("/account", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(isAccountAuthGateUrl, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible({ timeout: 30_000 });
  });
});
