import { expect, test } from "@playwright/test";

test.describe("auth entry pages", () => {
  test("renders login form states", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

    await page.getByLabel("Email").fill("reader@example.com");
    await page.locator('input[name="password"]').fill("correct-password");

    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("renders signup validation state", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

    await page.getByLabel("Email").fill("invalid@example");
    await page.locator('input[name="password"]').fill("short");
    await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Invalid email format")).toBeVisible();
  });
});
