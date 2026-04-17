import { expect, test } from "@playwright/test";

test.describe("dashboard", () => {
  test("renders the signed-out dashboard smoke state", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveTitle(/today's briefing/i);
    await expect(page.getByRole("heading", { name: /today's public briefing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what signing in unlocks/i })).toBeVisible();
    await expect(page.getByText(/preview the ranked public briefing here, then sign in/i)).toBeVisible();
  });
});
