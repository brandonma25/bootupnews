import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const resultsPath = path.join("test-results", "playwright-results.json");
const summaryPath = path.join("test-results", "ui-audit-summary.json");
const markdownPath = path.join("docs", "engineering", "testing", "ui-audit-report.md");
const routePaths = ["/", "/dashboard", "/topics", "/sources", "/history", "/settings"];
const auditCommands = [
  "npm run test:e2e:audit",
  "npm run test:e2e:audit:chromium",
  "npm run test:e2e:headed -- tests/audit tests/navigation tests/routes tests/responsive tests/smoke",
  "npm run test:e2e:report",
  'PLAYWRIGHT_BASE_URL="https://your-preview-url.vercel.app" UI_AUDIT_MODE=preview npm run test:e2e:audit:chromium',
  'PLAYWRIGHT_BASE_URL="https://your-production-url.example" UI_AUDIT_MODE=production npm run test:e2e:audit:chromium',
  "npm run audit:ui:report",
];

function walkSuites(suites = [], parentTitles = []) {
  const tests = [];

  for (const suite of suites) {
    const suiteTitles = suite.title ? [...parentTitles, suite.title] : parentTitles;

    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const results = test.results ?? [];
        const lastResult = results.at(-1);
        const status = test.outcome ?? lastResult?.status ?? (spec.ok ? "passed" : "failed");

        tests.push({
          title: [...suiteTitles, spec.title].filter(Boolean).join(" > "),
          project: test.projectName ?? "unknown",
          status,
          durationMs: results.reduce((total, result) => total + (result.duration ?? 0), 0),
          errors: results.flatMap((result) => result.errors ?? []),
        });
      }
    }

    tests.push(...walkSuites(suite.suites ?? [], suiteTitles));
  }

  return tests;
}

function buildSummary(results) {
  const tests = walkSuites(results.suites);
  const failedTests = tests.filter((test) => !["expected", "passed"].includes(test.status));
  const skippedTests = tests.filter((test) => ["skipped"].includes(test.status));
  const projects = [...new Set(tests.map((test) => test.project))].sort();

  return {
    generatedAt: new Date().toISOString(),
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    auditMode: process.env.UI_AUDIT_MODE ?? "local",
    summarySource: resultsPath,
    stats: {
      total: tests.length,
      passed: tests.length - failedTests.length - skippedTests.length,
      failed: failedTests.length,
      skipped: skippedTests.length,
      unexpected: results.stats?.unexpected ?? failedTests.length,
      flaky: results.stats?.flaky ?? 0,
    },
    projects,
    routesCovered: routePaths,
    behaviorsCovered: [
      "Desktop sidebar traversal across first-class app routes.",
      "Mobile drawer open, close, and route-change close behavior.",
      "Signed-out homepage CTA and auth-entry modal.",
      "Signed-out dashboard rendering, visible content, and named controls.",
      "Route-level screenshots attached to Playwright artifacts.",
      "Console, page, and failed-request diagnostics attached when detected.",
    ],
    failedTests: failedTests.map((test) => ({
      title: test.title,
      project: test.project,
      status: test.status,
      errors: test.errors.map((error) => error.message ?? String(error)),
    })),
  };
}

function markdownForSummary(summary) {
  const failedRows = summary.failedTests.length
    ? summary.failedTests.map((test) => `- ${test.project}: ${test.title} (${test.status})`).join("\n")
    : "- None in the latest generated summary.";

  return `# UI Audit Playwright Report

- Generated: ${summary.generatedAt}
- Base URL: \`${summary.baseURL}\`
- Audit mode: \`${summary.auditMode}\`
- Summary source: \`${summary.summarySource}\`

## Pass / Fail Summary

| Total | Passed | Failed | Skipped |
| ---: | ---: | ---: | ---: |
| ${summary.stats.total} | ${summary.stats.passed} | ${summary.stats.failed} | ${summary.stats.skipped} |

## Projects / Viewports

${summary.projects.map((project) => `- ${project}`).join("\n")}

## Routes Covered

${summary.routesCovered.map((route) => `- \`${route}\``).join("\n")}

## Behaviors Covered

${summary.behaviorsCovered.map((behavior) => `- ${behavior}`).join("\n")}

## Failed Tests

${failedRows}

## Artifacts Produced

- HTML report: \`playwright-report/index.html\`
- JSON summary: \`test-results/ui-audit-summary.json\`
- Raw Playwright JSON: \`test-results/playwright-results.json\`
- Per-test screenshots and diagnostics: \`test-results/**\`
- Traces: retained on failure by Playwright configuration.

## Known Gaps

- Real OAuth completion, provider callback truth, session persistence, and sign-out require human validation with a configured preview environment.
- Production mode is read-only traversal only; tests avoid submitting forms or mutating account data.
- Authenticated write flows are intentionally not automated without a dedicated test account.
- External news/source links are checked for safe attributes instead of being navigated in production-safe audit mode.

## How To Rerun

\`\`\`bash
${auditCommands.join("\n")}
\`\`\`
`;
}

async function main() {
  const rawResults = await readFile(resultsPath, "utf8").catch((error) => {
    throw new Error(
      `Could not read ${resultsPath}. Run npm run test:e2e:audit or another Playwright command first. ${error.message}`,
    );
  });
  const summary = buildSummary(JSON.parse(rawResults));

  await mkdir(path.dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(markdownPath, markdownForSummary(summary));

  console.log(`Wrote ${summaryPath}`);
  console.log(`Updated ${markdownPath}`);
}

await main();
