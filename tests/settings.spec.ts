import { expect, test } from "@playwright/test";

test.describe("legacy route demotion", () => {
  for (const path of ["/settings", "/topics", "/sources"]) {
    test(`${path} redirects through Account auth`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      await expect(page).toHaveURL((url) => {
        return url.pathname === "/login" && url.searchParams.get("redirectTo") === "/account";
      }, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }
});
