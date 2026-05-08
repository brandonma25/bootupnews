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
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    if (await page.getByRole("link", { name: "Details" }).first().isVisible()) {
      await expect(page.getByRole("link", { name: "Details" }).first()).toBeVisible();
    } else {
      await expectFallbackBriefingCopy(page);
    }
    await expectNoStaticHomepagePlaceholder(page);
    await expect(page.getByText("Daily Intelligence Aggregator")).toHaveCount(0);
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

    const topEventsTab = page.getByRole("tab", { name: "Top Events" });
    const topEventCards = page.getByTestId("home-top-event-card");
    const dateLabel = page.getByTestId("home-date-label");

    await expect(dateLabel).toBeVisible();
    await expect(topEventsTab).toHaveAttribute("aria-selected", "true");

    const topEventCount = await topEventCards.count();
    if (topEventCount === 0) {
      await expectFallbackBriefingCopy(page);
      await expect(page.getByRole("link", { name: "Details" })).toHaveCount(0);
      await expectNoStaticHomepagePlaceholder(page);
      expect(diagnostics.entries).toEqual([]);
      return;
    }

    await expect(topEventCards.first()).toBeVisible();
    expect(topEventCount).toBeGreaterThanOrEqual(3);
    expect(topEventCount).toBeLessThanOrEqual(5);

    await expect(page.getByTestId("home-top-event-key-points").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toHaveCount(0);
    await expect(page.getByText(/^RSS Feed$/)).toHaveCount(0);
    await expect(page.getByText(/^Category preferences$/)).toHaveCount(0);
    await expect(page.getByText(/^Newsletter$/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Open full briefing$/ })).toHaveCount(0);

    const structureOrder = await page.evaluate(() => {
      const date = document.querySelector('[data-testid="home-date-label"]');
      const tabs = document.querySelector('[role="tablist"]');
      const firstCard = document.querySelector('[data-testid="home-top-event-card"]');

      if (!date || !tabs || !firstCard) {
        return null;
      }

      return {
        dateBeforeTabs: Boolean(date.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING),
        tabsBeforeCards: Boolean(tabs.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });

    expect(structureOrder).toEqual({
      dateBeforeTabs: true,
      tabsBeforeCards: true,
    });

    const underline = await topEventsTab.evaluate((element) => {
      const style = window.getComputedStyle(element, "::after");
      return {
        backgroundColor: style.backgroundColor,
        height: style.height,
      };
    });

    expect(underline).toEqual({
      backgroundColor: "rgb(44, 95, 46)",
      height: "2px",
    });

    const detailHref = await page.getByRole("link", { name: "Details" }).first().getAttribute("href");
    const detailDateKey = detailHref?.match(/\/briefing\/(\d{4}-\d{2}-\d{2})/)?.[1];
    expect(detailDateKey).toBeTruthy();

    const dateLabelText = (await dateLabel.textContent())?.trim() ?? "";
    const todayKey = await page.evaluate(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = `${now.getMonth() + 1}`.padStart(2, "0");
      const day = `${now.getDate()}`.padStart(2, "0");
      return `${year}-${month}-${day}`;
    });

    if (detailDateKey === todayKey) {
      expect(dateLabelText).toMatch(/^Today • /);
    } else {
      const expectedFallbackLabel = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${detailDateKey}T12:00:00`));

      expect(dateLabelText).toBe(expectedFallbackLabel);
      expect(dateLabelText).not.toMatch(/^Today\b/);
    }

    expect(diagnostics.entries).toEqual([]);
  });

  test("shows the signed-out category soft gate without duplicating Top Events when depth content exists", async ({ page, diagnostics }) => {
    await page.goto("/");

    const topEventCards = page.getByTestId("home-top-event-card");
    const gateCopy = "Sign up to be notified when new signals are published.";
    const oldGateCopy = "Create a free account to read Tech News, Economics, and Politics";
    const techTab = page.getByRole("tab", { name: "Tech" });
    const topEventCount = await topEventCards.count();

    if (topEventCount === 0) {
      await expectFallbackBriefingCopy(page);
      await expect(page.getByText(gateCopy)).toHaveCount(0);
      await expect(page.getByText(oldGateCopy)).toHaveCount(0);
      await expectNoStaticHomepagePlaceholder(page);
      expect(diagnostics.entries).toEqual([]);
      return;
    }

    await expect(topEventCards.first()).toBeVisible();
    await expect(page.getByText(gateCopy)).toHaveCount(0);
    await expect(page.getByText(oldGateCopy)).toHaveCount(0);

    await expect(techTab).toBeVisible();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await techTab.click();

      if ((await techTab.getAttribute("aria-selected")) === "true") {
        break;
      }

      await page.waitForTimeout(250 * (attempt + 1));
    }

    const gate = page.getByTestId("category-soft-gate");

    await expect(techTab).toHaveAttribute("aria-selected", "true");
    await expect(gate).toBeVisible();
    await expect(gate.getByText(gateCopy)).toBeVisible();
    await expect(gate.getByText(oldGateCopy)).toHaveCount(0);
    await expect(gate.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup?redirectTo=%2F");
    await expect(gate.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login?redirectTo=%2F");
    await expect(topEventCards).toHaveCount(0);

    await page.getByRole("button", { name: "Dismiss category gate" }).click();

    await expect(page.getByText(gateCopy)).toHaveCount(0);
    await expect(page.getByText(oldGateCopy)).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    await expect(topEventCards.first()).toBeVisible();
    expect(diagnostics.entries).toEqual([]);
  });
});
