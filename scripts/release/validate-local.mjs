import process from "node:process";

import {
  DEFAULT_LOCAL_BASE_URL,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORT,
  createStep,
  exitForSteps,
  findPortOwners,
  killProcesses,
  parseArgs,
  printSection,
  printSummary,
  probeRoutes,
  runCommand,
  startDevServer,
  waitForHttpReady,
} from "./common.mjs";

function envForLocalRun() {
  return {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

function envForAppBootstrap(baseUrl) {
  return {
    ...envForLocalRun(),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || baseUrl,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "test-publishable-key",
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "test-openai-key",
    THE_NEWS_API_KEY: process.env.THE_NEWS_API_KEY || "test-news-api-key",
    PLAYWRIGHT_MANAGED_WEBSERVER: "0",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const installMode = args.install || "if-needed";
  const e2eProject = args["e2e-project"] || "chromium";
  const baseUrl = args["base-url"] || DEFAULT_LOCAL_BASE_URL;
  const env = envForLocalRun();
  const appEnv = envForAppBootstrap(baseUrl);
  const steps = [
    createStep("dependency install", { soft: installMode !== "always" }),
    createStep("lint", { soft: true }),
    createStep("unit tests", { soft: true }),
    createStep("build"),
    createStep("dev server rule"),
    createStep(`playwright (${e2eProject})`, { soft: true }),
    createStep("local smoke routes"),
  ];
  const [installStep, lintStep, testStep, buildStep, devStep, playwrightStep, smokeStep] = steps;
  let devServer;

  try {
    printSection("Local Release Gate");

    const shouldInstall = installMode === "always" || (installMode === "if-needed" && !process.env.CI);

    if (shouldInstall) {
      runCommand("npm", ["install"], {
        step: installStep,
        allowFailure: installStep.soft,
        env: appEnv,
      });
    } else {
      installStep.status = "skipped";
      installStep.details = "Install skipped by configuration.";
    }

    runCommand("npm", ["run", "lint"], {
      step: lintStep,
      allowFailure: true,
      env,
    });

    runCommand("npm", ["run", "test"], {
      step: testStep,
      allowFailure: true,
      env,
    });

    runCommand("npm", ["run", "build"], {
      step: buildStep,
      env: appEnv,
    });

    const startedAt = Date.now();
    const portOwners = findPortOwners(DEFAULT_PORT);

    if (portOwners.length > 0) {
      killProcesses(portOwners);
    }

    devServer = startDevServer({
      env: appEnv,
      host: DEFAULT_LOCAL_HOST,
    });

    const devServerExit = new Promise((_, reject) => {
      devServer.once("exit", (code, signal) => {
        reject(
          new Error(
            `Dev server exited before readiness check completed (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
          ),
        );
      });
    });

    await Promise.race([waitForHttpReady({ url: baseUrl }), devServerExit]);
    devStep.status = "passed";
    devStep.durationMs = Date.now() - startedAt;
    devStep.details =
      portOwners.length > 0
        ? `Freed port ${DEFAULT_PORT} from PID(s): ${portOwners.join(", ")}`
        : `Dev server ready at ${baseUrl}`;

    runCommand("npx", ["playwright", "test", "--project", e2eProject], {
      step: playwrightStep,
      allowFailure: true,
      env: appEnv,
    });

    const smokeStartedAt = Date.now();
    const smokeResults = await probeRoutes({
      baseUrl,
      stage: "local",
      routes: undefined,
    });
    smokeStep.status = "passed";
    smokeStep.durationMs = Date.now() - smokeStartedAt;
    smokeStep.details = smokeResults.map((result) => `${result.path} -> HTTP ${result.status}`).join("; ");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (buildStep.status === "pending") {
      buildStep.status = "failed";
      buildStep.details = message;
    } else if (devStep.status === "pending") {
      devStep.status = "failed";
      devStep.details = message;
    } else if (smokeStep.status === "pending") {
      smokeStep.status = "failed";
      smokeStep.details = message;
    }
  } finally {
    if (devServer && !devServer.killed) {
      devServer.kill("SIGTERM");
    }
  }

  printSummary({
    label: "Local release gate",
    steps,
    extraLines: [`Local URL: ${baseUrl}`],
  });

  exitForSteps(steps);
}

await main();
