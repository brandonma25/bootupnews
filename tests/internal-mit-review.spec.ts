import { expect, test } from "@playwright/test";

test.describe("internal MIT review", () => {
  test("withholds review evidence from signed-out visitors", async ({ page }) => {
    await page.goto("/internal/mit-review");

    await expect(page).toHaveTitle(/MIT Review - Internal/i);
    await expect(page.getByRole("heading", { name: /internal access required/i })).toBeVisible();
    await expect(page.getByText(/no evidence exposed/i)).toBeVisible();
    await expect(page.getByText(/Public requests do not receive source-resolution evidence/i)).toBeVisible();
    await expect(page.getByText(/mit-technology-review/i)).toHaveCount(0);
    await expect(page.getByText(/feedUrl/i)).toHaveCount(0);
  });
});
