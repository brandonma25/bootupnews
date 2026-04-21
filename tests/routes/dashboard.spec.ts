import { expect, test } from "../utils/audit-fixture";
import {
  expectNamedVisibleButtons,
  expectNoAppCrash,
  expectSafeInternalLinks,
} from "../utils/assertions";

test.describe("dashboard route", () => {
  test("renders stable signed-out dashboard UI with named controls", async ({ page }) => {
    await page.goto("/dashboard");

    await expectNoAppCrash(page);
    await expect(page.getByRole("heading", { name: /today's public briefing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what signing in unlocks/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /today's signal briefing/i })).toBeVisible();

    await expectNamedVisibleButtons(page);
    await expectSafeInternalLinks(page);
  });
});
