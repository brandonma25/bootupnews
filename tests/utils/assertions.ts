import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, type TestInfo } from "@playwright/test";

import type { AuditRoute } from "./routes";

const auditNavigationTimeoutMs = 20_000;
const appCrashPattern =
  /application error|unhandled runtime error|this page could not be found|500 internal server error/i;
const interruptedNavigationPattern = /is interrupted by another navigation|net::ERR_ABORTED/i;
const navigationTimeoutPattern = /timeout .* exceeded/i;

function isRecoverableNavigationError(error: unknown) {
  return (
    error instanceof Error &&
    (interruptedNavigationPattern.test(error.message) || navigationTimeoutPattern.test(error.message))
  );
}

export async function waitForAuditNavigationToSettle(page: Page) {
  await page.waitForLoadState("load", { timeout: auditNavigationTimeoutMs }).catch(() => undefined);
}

export async function gotoAuditPath(page: Page, path: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForAuditNavigationToSettle(page);

    try {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });

      await page.waitForURL((url) => url.pathname === path, { timeout: auditNavigationTimeoutMs });
      await waitForAuditNavigationToSettle(page);

      return response;
    } catch (error) {
      lastError = error;

      try {
        await page.waitForURL((url) => url.pathname === path, { timeout: auditNavigationTimeoutMs });
        await waitForAuditNavigationToSettle(page);
        return null;
      } catch {
        if (!isRecoverableNavigationError(error) || attempt === 2) {
          throw error;
        }

        if (page.isClosed()) {
          throw error;
        }
      }

      await page.waitForTimeout(250 * (attempt + 1));
    }
  }

  throw lastError;
}

export async function expectAuditRouteUrl(page: Page, route: AuditRoute) {
  if (route.urlMatches) {
    await page.waitForURL(route.urlMatches, { timeout: auditNavigationTimeoutMs });
    return;
  }

  const expectedPath = route.expectedPath ?? route.path;

  await page.waitForURL((url) => {
    if (url.pathname !== expectedPath) return false;

    return Object.entries(route.expectedSearchParams ?? {}).every(
      ([key, value]) => url.searchParams.get(key) === value,
    );
  }, { timeout: auditNavigationTimeoutMs });
}

async function gotoAuditRoute(page: Page, route: AuditRoute) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForAuditNavigationToSettle(page);

    try {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });

      await expectAuditRouteUrl(page, route);
      await waitForAuditNavigationToSettle(page);

      return response;
    } catch (error) {
      lastError = error;

      try {
        await expectAuditRouteUrl(page, route);
        await waitForAuditNavigationToSettle(page);
        return null;
      } catch {
        if (!isRecoverableNavigationError(error) || attempt === 2) {
          throw error;
        }

        if (page.isClosed()) {
          throw error;
        }

        await page.waitForTimeout(250 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export async function expectNoAppCrash(page: Page) {
  await expect(page.locator("body")).not.toContainText(appCrashPattern);
}

export async function expectRouteContent(page: Page, route: AuditRoute) {
  await expectNoAppCrash(page);
  await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible({
    timeout: 30_000,
  });
}

export async function visitAndAssertRoute(page: Page, route: AuditRoute) {
  const response = await gotoAuditRoute(page, route);

  if (response) {
    expect(response.status(), `${route.path} should load successfully`).toBeLessThan(400);
  }
  await expectRouteContent(page, route);
}

export async function captureAuditScreenshot(
  page: Page,
  testInfo: TestInfo,
  route: AuditRoute,
  prefix = "route",
) {
  const screenshotPath = testInfo.outputPath("screenshots", `${prefix}-${route.slug}.png`);

  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(`${prefix}-${route.slug}`, {
    path: screenshotPath,
    contentType: "image/png",
  });

  return screenshotPath;
}

export async function expectNamedVisibleButtons(page: Page) {
  const unnamedButtons = await page.locator("button:visible").evaluateAll((buttons) =>
    buttons
      .map((button, index) => {
        const label =
          button.getAttribute("aria-label") ??
          button.getAttribute("title") ??
          button.textContent ??
          "";

        return {
          index,
          label: label.trim(),
          html: button.outerHTML.slice(0, 180),
        };
      })
      .filter((button) => button.label.length === 0),
  );

  expect(unnamedButtons).toEqual([]);
}

export async function expectSafeInternalLinks(page: Page) {
  const brokenInternalLinks = await page.locator('a[href^="/"]:visible').evaluateAll((links) =>
    links
      .map((link) => ({
        text: link.textContent?.trim() ?? "",
        href: link.getAttribute("href") ?? "",
      }))
      .filter((link) => !link.href || link.href.startsWith("//")),
  );

  expect(brokenInternalLinks).toEqual([]);
}
