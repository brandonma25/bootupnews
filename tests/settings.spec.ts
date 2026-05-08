import { expect, test } from "@playwright/test";

function isAccountAuthGateUrl(url: URL) {
  return (
    url.pathname === "/account" ||
    (url.pathname === "/login" && url.searchParams.get("redirectTo") === "/account")
  );
}

test.describe("legacy route demotion", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const path of ["/settings", "/topics", "/sources"]) {
    test(`${path} redirects through Account auth`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      await expect(page).toHaveURL(isAccountAuthGateUrl, { timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible({ timeout: 30_000 });
    });
  }
});
