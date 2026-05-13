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
    await expect(page.getByText("BROWSE BY")).toBeVisible();
    await expect(page.getByRole("link", { name: "Technology" })).toHaveAttribute("href", "/technology");
    await expect(page.getByRole("link", { name: "Finance" })).toHaveAttribute("href", "/economics");
    await expect(page.getByRole("link", { name: "Politics" })).toHaveAttribute("href", "/politics");

    await expectNamedVisibleButtons(page);
    await expectSafeInternalLinks(page);
  });

  for (const { path, heading } of [
    { path: "/technology", heading: "Technology" },
    { path: "/economics", heading: "Finance" },
    { path: "/politics", heading: "Politics" },
  ]) {
    test(`${path} renders a dedicated category page`, async ({ page }) => {
      await page.goto(path);

      await expectNoAppCrash(page);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByText("BROWSE BY")).toBeVisible();
      await expect(page.getByRole("link", { name: "Technology" })).toHaveAttribute("href", "/technology");
      await expect(page.getByRole("link", { name: "Finance" })).toHaveAttribute("href", "/economics");
      await expect(page.getByRole("link", { name: "Politics" })).toHaveAttribute("href", "/politics");

      await expectNamedVisibleButtons(page);
      await expectSafeInternalLinks(page);
    });
  }
});
