import { expect, test } from "../utils/audit-fixture";

const fallbackBriefingCopy =
  /Showing the most recently published briefing\.|The latest briefing is not yet available\. Please check back soon\./;

test.describe("homepage smoke", () => {
  test("loads the public V1 homepage and respects the current fallback state", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");

    const detailLink = page.getByRole("link", { name: "Details" }).first();
    if (!(await detailLink.isVisible())) {
      await expect(page.getByText(fallbackBriefingCopy).first()).toBeVisible();
      await expect(page.getByText(/stored public signal snapshot|placeholder:|sample slot|fallback rail/i)).toHaveCount(0);
      return;
    }

    await expect(detailLink).toBeVisible();
    await detailLink.click();

    await expect(page).toHaveURL(/\/briefing\/\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("link", { name: /back to history/i })).toBeVisible();
  });
});
