import type { Page } from "@playwright/test";

import { expect, test } from "./utils/audit-fixture";

async function expectNoStaticHomepagePlaceholder(page: Page) {
  await expect(
    page.getByText(/stored public signal snapshot|placeholder:|sample slot|fallback rail|rail readable/i),
  ).toHaveCount(0);
}

async function expectFallbackBriefingCopy(page: Page) {
  await expect(
    page
      .getByText(
        /Showing the most recently published briefing\.|The latest briefing is not yet available\. Please check back soon\./,
      )
      .first(),
  ).toBeVisible();
}

test.describe("homepage", () => {
  test("renders the public V1 briefing flow", async ({ page, diagnostics }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Boot Up/i);
    await expect(page.getByRole("heading", { name: "Today's signals" })).toBeVisible();
    await expect(page.getByText("For people who want to understand the world, not just consume it.").first()).toBeVisible();
    await expect(page.getByText("Browse by")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveCount(0);
    if (await page.getByRole("link", { name: "Read more →" }).first().isVisible()) {
      await expect(page.getByRole("link", { name: "Read more →" }).first()).toBeVisible();
    } else {
      await expectFallbackBriefingCopy(page);
    }
    await expectNoStaticHomepagePlaceholder(page);
    await expect(page.getByText("Daily Intelligence Aggregator")).toHaveCount(0);
    await expect(page.getByText("Daily Intelligence Briefing")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Details" })).toHaveCount(0);
    expect(diagnostics.entries).toEqual([]);
  });

  test("surfaces callback error state with a login recovery link", async ({ page }) => {
    await page.goto("/?auth=callback-error");

    await expect(
      page.getByRole("alert").getByText(/sign-in callback could not be completed/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /return to login/i })).toHaveAttribute("href", "/login");
  });

  test("matches the signed-out homepage QA contract", async ({ page, diagnostics }) => {
    await page.goto("/");

    const signalCards = page.getByTestId("signal-card");

    await expect(page.getByRole("heading", { name: "Today's signals" })).toBeVisible();
    await expect(page.getByText("Browse by")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveCount(0);

    const signalCardCount = await signalCards.count();
    if (signalCardCount === 0) {
      await expectFallbackBriefingCopy(page);
      await expect(page.getByRole("link", { name: "Read more →" })).toHaveCount(0);
      await expectNoStaticHomepagePlaceholder(page);
      expect(diagnostics.entries).toEqual([]);
      return;
    }

    await expect(signalCards.first()).toBeVisible();
    expect(signalCardCount).toBeLessThanOrEqual(5);

    await expect(signalCards.first().getByText(/Core signal · 01/i)).toBeVisible();
    await expect(signalCards.first().getByText("Why this matters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Read more →" }).first()).toBeVisible();
    await expect(page.getByText(/min read/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Details" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sign out/i })).toHaveCount(0);
    await expect(page.getByText(/^RSS Feed$/)).toHaveCount(0);
    await expect(page.getByText(/^Category preferences$/)).toHaveCount(0);
    await expect(page.getByText(/^Newsletter$/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Open full briefing$/ })).toHaveCount(0);

    const structureOrder = await page.evaluate(() => {
      const header = Array.from(document.querySelectorAll("h1")).find((element) =>
        element.textContent?.includes("Today's signals"),
      );
      const firstCard = document.querySelector('[data-testid="signal-card"]');
      const browseBy =
        document.querySelector('[data-testid="browse-by-heading"]') ??
        Array.from(document.querySelectorAll("h2, p")).find((element) =>
          element.textContent?.trim().toLowerCase().startsWith("browse by"),
        );

      if (!header || !firstCard || !browseBy) {
        return null;
      }

      return {
        headerBeforeCards: Boolean(header.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING),
        cardsBeforeBrowse: Boolean(firstCard.compareDocumentPosition(browseBy) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });

    expect(structureOrder).toEqual({
      headerBeforeCards: true,
      cardsBeforeBrowse: true,
    });

    const detailHref = await page.getByRole("link", { name: "Read more →" }).first().getAttribute("href");
    const detailDateKey = detailHref?.match(/\/briefing\/(\d{4}-\d{2}-\d{2})/)?.[1];
    expect(detailDateKey).toBeTruthy();

    expect(diagnostics.entries).toEqual([]);
  });

  test("shows the signed-out category soft gate without duplicating Top Events when depth content exists", async ({ page, diagnostics }) => {
    await page.goto("/");

    const signalCards = page.getByTestId("signal-card");
    const gateCopy = "Sign up to be notified when new signals are published.";
    const oldGateCopy = "Create a free account to read Tech News, Economics, and Politics";
    const techButton = page.getByRole("button", { name: "Tech" });
    const signalCardCount = await signalCards.count();

    if (signalCardCount === 0 || !(await techButton.isVisible())) {
      await expectFallbackBriefingCopy(page);
      await expect(page.getByText(gateCopy)).toHaveCount(0);
      await expect(page.getByText(oldGateCopy)).toHaveCount(0);
      await expectNoStaticHomepagePlaceholder(page);
      expect(diagnostics.entries).toEqual([]);
      return;
    }

    await expect(signalCards.first()).toBeVisible();
    await expect(page.getByText(gateCopy)).toHaveCount(0);
    await expect(page.getByText(oldGateCopy)).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveCount(0);

    await expect(techButton).toBeVisible();
    await techButton.click();

    const gate = page.getByTestId("category-soft-gate");

    await expect(gate).toBeVisible();
    await expect(gate.getByText(gateCopy)).toBeVisible();
    await expect(gate.getByText(oldGateCopy)).toHaveCount(0);
    await expect(gate.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup?redirectTo=%2F");
    await expect(gate.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login?redirectTo=%2F");
    expect(diagnostics.entries).toEqual([]);
  });
});
