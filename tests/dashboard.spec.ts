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

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: /today's public briefing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what signing in unlocks/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /unlock full briefing/i })).toBeVisible();
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
});
