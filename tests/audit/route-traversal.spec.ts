import { expect, test } from "../utils/audit-fixture";
import { coreRoutes } from "../utils/routes";
import { traverseKnownRoutes } from "../utils/traversal";

test.describe("route traversal audit", () => {
  test("captures route screenshots and structured traversal output", async ({ page }, testInfo) => {
    const results = await traverseKnownRoutes(page, testInfo);

    await testInfo.attach("route-traversal.json", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });

    expect(results).toHaveLength(coreRoutes.length);
  });
});
