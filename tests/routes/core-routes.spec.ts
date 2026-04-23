import { test } from "../utils/audit-fixture";
import { visitAndAssertRoute } from "../utils/assertions";
import { coreRoutes } from "../utils/routes";

test.describe("core route health", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const route of coreRoutes) {
    test(`${route.name} route loads without a crash`, async ({ page }) => {
      await visitAndAssertRoute(page, route);
    });
  }
});
