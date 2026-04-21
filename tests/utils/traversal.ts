import type { Page, TestInfo } from "@playwright/test";

import {
  captureAuditScreenshot,
  expectNamedVisibleButtons,
  expectSafeInternalLinks,
  visitAndAssertRoute,
} from "./assertions";
import { coreRoutes, type AuditRoute } from "./routes";

export type RouteTraversalResult = {
  name: string;
  path: string;
  screenshotPath: string;
};

export async function traverseKnownRoutes(
  page: Page,
  testInfo: TestInfo,
  routes: AuditRoute[] = coreRoutes,
) {
  const results: RouteTraversalResult[] = [];

  for (const route of routes) {
    await visitAndAssertRoute(page, route);
    await expectNamedVisibleButtons(page);
    await expectSafeInternalLinks(page);

    results.push({
      name: route.name,
      path: route.path,
      screenshotPath: await captureAuditScreenshot(page, testInfo, route, "audit-route"),
    });
  }

  return results;
}
