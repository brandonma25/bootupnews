import { expect, test } from "../utils/audit-fixture";
import {
  expectAuditRouteUrl,
  expectRouteContent,
  gotoAuditPath,
  waitForAuditNavigationToSettle,
} from "../utils/assertions";
import { appShellRoutes } from "../utils/routes";

test.describe("desktop navigation", () => {
  test.describe.configure({ timeout: 90_000 });

  test("sidebar links route to first-class app pages", async ({ page }) => {
    for (const route of appShellRoutes) {
      const startPath = route.path === "/" ? "/history" : "/";

      await gotoAuditPath(page, startPath);

      const link = page.getByRole("link", { name: new RegExp(`^${route.navLabel}$`) }).first();

      await expect(link).toBeVisible();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await link.click();

        try {
          await expectAuditRouteUrl(page, route);
          break;
        } catch (error) {
          if (attempt === 2) {
            throw error;
          }

          await page.waitForTimeout(250 * (attempt + 1));
        }
      }
      await waitForAuditNavigationToSettle(page);
      await expectRouteContent(page, route);
    }
  });
});
