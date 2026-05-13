import { expect, test } from "../utils/audit-fixture";

const fallbackBriefingCopy =
  /Showing the most recently published briefing\.|The latest briefing is not yet available\. Please check back soon\.|The published briefing is temporarily unavailable while the latest edition is verified\./;

test.describe("homepage smoke", () => {
  test("loads the public V1 homepage and respects the current fallback state", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Bootup News").first()).toBeVisible();
    await expect(page.getByText("For people who want to understand the world, not just consume it.").first())
      .toBeVisible();
    await expect(page.getByText("BROWSE BY")).toBeVisible();
    await expect(page.getByRole("link", { name: "Technology" })).toHaveAttribute("href", "/technology");
    await expect(page.getByRole("link", { name: "Finance" })).toHaveAttribute("href", "/economics");
    await expect(page.getByRole("link", { name: "Politics" })).toHaveAttribute("href", "/politics");
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveCount(0);

    const signalCards = page.getByTestId("signal-card");
    const detailLink = page.getByRole("link", { name: "Read more →" }).first();
    if (!(await detailLink.isVisible())) {
      if ((await signalCards.count()) > 0) {
        await expect(signalCards.first()).toBeVisible();
        await expect(page.getByRole("link", { name: "Read more →" })).toHaveCount(0);
        return;
      }

      await expect(page.getByText(fallbackBriefingCopy).first()).toBeVisible();
      await expect(page.getByText(/stored public signal snapshot|placeholder:|sample slot|fallback rail/i)).toHaveCount(0);
      await expect(page.getByText(/min read/i)).toHaveCount(0);
      return;
    }

    await expect(detailLink).toBeVisible();
    await detailLink.click();

    await expect(page).toHaveURL(/\/briefing\/\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("link", { name: /back to history/i })).toBeVisible();
  });
});
