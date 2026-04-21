import { expect, test } from "@playwright/test";

test.describe("auth entry pages", () => {
  test("renders login form states", async ({ page }) => {
    await page.goto("/login?redirectTo=/history", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot Password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/signup?redirectTo=%2Fhistory",
    );

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");

    await emailInput.fill("reader@example.com");
    await passwordInput.fill("correct-password");

    await expect(emailInput).toHaveValue("reader@example.com");
    await expect(passwordInput).toHaveValue("correct-password");

    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("renders signup validation state", async ({ page }) => {
    await page.goto("/signup?redirectTo=/briefing/2026-04-21", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("link", { name: /already have an account/i })).toHaveAttribute(
      "href",
      "/login?redirectTo=%2Fbriefing%2F2026-04-21",
    );

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "password");

    await page.getByLabel("Email").fill("invalid@example");
    await page.locator('input[name="password"]').fill("short");
    await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Invalid email format")).toBeVisible();
  });
});
