import { expect, test } from "../utils/audit-fixture";

test.describe("homepage smoke", () => {
  test("loads the public homepage and opens the primary auth CTA", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /preview a structured intelligence briefing before you unlock the full workspace/i,
      }),
    ).toBeVisible();

    const primaryCta = page.getByRole("button", { name: /personalize briefing/i });

    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toBeEnabled();
    await primaryCta.click();

    await expect(page.getByRole("heading", { name: /continue to daily intelligence/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
