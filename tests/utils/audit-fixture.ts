import { expect, test as base } from "@playwright/test";

import { capturePageDiagnostics, type PageDiagnostics } from "./diagnostics";

type AuditFixtures = {
  diagnostics: PageDiagnostics;
};

export const test = base.extend<AuditFixtures>({
  diagnostics: [
    async ({ page }, runFixture, testInfo) => {
      const diagnostics = capturePageDiagnostics(page);

      try {
        await runFixture(diagnostics);
      } finally {
        await diagnostics.attach(testInfo);
        diagnostics.dispose();
      }
    },
    { auto: true },
  ],
});

export { expect };
