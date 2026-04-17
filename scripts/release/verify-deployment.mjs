import process from "node:process";

import {
  createStep,
  exitForSteps,
  parseArgs,
  parseRouteExpectations,
  printSummary,
  probeRoutes,
} from "./common.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args["base-url"] || args.url || process.env.RELEASE_BASE_URL;
  const stage = args.stage || "preview";
  const routes = parseRouteExpectations(args.routes || process.env.RELEASE_ROUTE_EXPECTATIONS);
  const step = createStep(`${stage} route probe`);
  const startedAt = Date.now();

  if (!baseUrl) {
    step.status = "failed";
    step.details = "Provide --base-url or set RELEASE_BASE_URL.";
    printSummary({
      label: `${stage} verification`,
      steps: [step],
    });
    exitForSteps([step]);
  }

  try {
    const results = await probeRoutes({ baseUrl, stage, routes });
    step.status = "passed";
    step.durationMs = Date.now() - startedAt;
    step.details = results.map((result) => `${result.path} -> HTTP ${result.status}`).join("; ");
  } catch (error) {
    step.status = "failed";
    step.durationMs = Date.now() - startedAt;
    step.details = error instanceof Error ? error.message : String(error);
  }

  printSummary({
    label: `${stage} verification`,
    steps: [step],
    extraLines: [`Base URL: ${baseUrl}`],
  });

  exitForSteps([step]);
}

await main();

