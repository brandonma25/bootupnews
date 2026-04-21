import { expect, test } from "@playwright/test";

test.describe("password reset pages", () => {
  test("renders forgot password form states", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Back to login" })).toHaveAttribute("href", "/login");

    const emailInput = page.getByLabel("Email");
    const submit = page.getByRole("button", { name: "Send reset link" });

    await expect(async () => {
      await emailInput.fill("");
      await emailInput.fill("reader@example.com");
      await expect(submit).toBeEnabled({ timeout: 500 });
    }).toPass();
  });

  test("renders reset password missing-token state", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page.getByLabel("New password")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Update password" })).toBeDisabled();
    await expect(
      page.getByText("This reset link has expired. Please request a new one."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new one" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  test("renders reset password validation state when a token is present", async ({ page }) => {
    await page.goto("/reset-password?code=recovery-code");

    await expect(page.getByLabel("New password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update password" })).toBeDisabled();

    await page.getByLabel("New password").fill("short");
    await expect(page.getByRole("button", { name: "Update password" })).toBeEnabled();
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(page.getByText("Password too short")).toBeVisible();
  });
});
