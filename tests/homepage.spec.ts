import { expect, test } from "@playwright/test";

test.describe("homepage", () => {
  test("renders the public V1 briefing flow", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Daily Intelligence/i);
    await expect(page.getByRole("heading", { name: /today's briefing/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("link", { name: "Open full briefing" })).toBeVisible();
  });

  test("surfaces callback error state with a login recovery link", async ({ page }) => {
    await page.goto("/?auth=callback-error");

    await expect(
      page.getByRole("alert").getByText(/sign-in callback could not be completed/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /return to login/i })).toHaveAttribute("href", "/login");
  });
});
