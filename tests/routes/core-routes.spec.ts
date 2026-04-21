import { test } from "../utils/audit-fixture";
import { visitAndAssertRoute } from "../utils/assertions";
import { coreRoutes } from "../utils/routes";

test.describe("core route health", () => {
  for (const route of coreRoutes) {
    test(`${route.name} route loads without a crash`, async ({ page }) => {
      await visitAndAssertRoute(page, route);
    });
  }
});
