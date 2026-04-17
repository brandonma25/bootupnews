import { expect, test } from "@playwright/test";

test.describe("homepage", () => {
  test("renders the public briefing smoke flow", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Daily Intelligence/i);
    await expect(
      page.getByRole("heading", {
        name: /preview a structured intelligence briefing before you unlock the full workspace/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /daily intelligence/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /confirmed developments, ranked with transparent logic/i }),
    ).toBeVisible();
  });

  test("opens the sign-in entry flow for signed-out visitors", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /personalize briefing/i }).click();

    await expect(
      page.getByRole("heading", { name: /continue to daily intelligence/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in with email/i })).toBeVisible();
  });
});
