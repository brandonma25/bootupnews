import type { ConsoleMessage, Page, Request, TestInfo } from "@playwright/test";

export type DiagnosticEntry = {
  kind: "console" | "pageerror" | "requestfailed";
  message: string;
  url?: string;
  method?: string;
  location?: {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
};

export type PageDiagnostics = {
  entries: DiagnosticEntry[];
  attach: (testInfo: TestInfo) => Promise<void>;
  dispose: () => void;
};

const noisyRequestPatterns = [
  /\/favicon\.ico(?:\?|$)/i,
  /\/__nextjs_original-stack-frames/i,
];

export function capturePageDiagnostics(page: Page): PageDiagnostics {
  const entries: DiagnosticEntry[] = [];

  function shouldIgnoreRequest(request: Request) {
    return noisyRequestPatterns.some((pattern) => pattern.test(request.url()));
  }

  function onConsole(message: ConsoleMessage) {
    if (message.type() !== "error") {
      return;
    }

    entries.push({
      kind: "console",
      message: message.text(),
      location: message.location(),
    });
  }

  function onPageError(error: Error) {
    entries.push({
      kind: "pageerror",
      message: error.message,
    });
  }

  function onRequestFailed(request: Request) {
    if (shouldIgnoreRequest(request)) {
      return;
    }

    entries.push({
      kind: "requestfailed",
      message: request.failure()?.errorText ?? "Request failed",
      url: request.url(),
      method: request.method(),
    });
  }

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  return {
    entries,
    async attach(testInfo) {
      if (entries.length === 0) {
        return;
      }

      await testInfo.attach("diagnostics.json", {
        body: JSON.stringify(entries.slice(0, 50), null, 2),
        contentType: "application/json",
      });
    },
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
    },
  };
}
