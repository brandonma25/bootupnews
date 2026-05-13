import { expect, test } from "../utils/audit-fixture";
import {
  expectNamedVisibleButtons,
  expectNoAppCrash,
  expectSafeInternalLinks,
} from "../utils/assertions";

test.describe("dashboard route", () => {
  test("redirects to the stable V1 Home route", async ({ page }) => {
    await page.goto("/dashboard");

    await expectNoAppCrash(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Today's signals" })).toBeVisible();
    await expect(page.getByText("Browse by")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tech" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finance" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Politics" })).toBeVisible();

    await expectNamedVisibleButtons(page);
    await expectSafeInternalLinks(page);
  });

  for (const path of ["/technology", "/economics", "/politics"]) {
    test(`${path} redirects to Home so category browsing stays in homepage tabs`, async ({ page }) => {
      await page.goto(path);

      await expectNoAppCrash(page);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { name: "Today's signals" })).toBeVisible();
      await expect(page.getByText("Browse by")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Tech" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Finance" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Politics" })).toBeVisible();

      await expectNamedVisibleButtons(page);
      await expectSafeInternalLinks(page);
    });
  }
});
