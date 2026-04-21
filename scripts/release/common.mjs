import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

export const DEFAULT_LOCAL_BASE_URL = "http://127.0.0.1:3000";
export const DEFAULT_LOCAL_HOST = "127.0.0.1";
export const DEFAULT_PORT = 3000;
export const DEFAULT_ROUTE_EXPECTATIONS = [
  {
    path: "/",
    expected: [
      "Daily Intelligence Briefing",
      "Top Events",
      "Why it matters",
      "Details",
    ],
    signedOutExpected: ["Public briefing", "Sign in to unlock History and Account."],
  },
  {
    path: "/dashboard",
    expected: [],
    signedOutExpected: [],
  },
];

export function createStep(name, { soft = false } = {}) {
  return {
    name,
    soft,
    status: "pending",
    code: null,
    durationMs: 0,
    details: "",
  };
}

export function formatDuration(durationMs) {
  const seconds = (durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1);
  return `${seconds}s`;
}

export function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);

    if (inlineValue !== undefined) {
      options[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      options[rawKey] = "true";
      continue;
    }

    options[rawKey] = next;
    index += 1;
  }

  return options;
}

export function printSection(title) {
  console.log(`\n== ${title} ==`);
}

export function printSummary({ label, steps, extraLines = [] }) {
  printSection(`${label} Summary`);

  for (const step of steps) {
    const icon =
      step.status === "passed" ? "PASS" : step.status === "failed" ? "FAIL" : "WARN";
    const suffix = step.durationMs ? ` (${formatDuration(step.durationMs)})` : "";
    console.log(`${icon} ${step.name}${suffix}`);

    if (step.details) {
      console.log(`  ${step.details}`);
    }
  }

  for (const line of extraLines) {
    console.log(line);
  }
}

export function exitForSteps(steps) {
  const hasBlockingFailure = steps.some((step) => step.status === "failed" && !step.soft);
  const hasSoftFailure = steps.some((step) => step.status === "failed" && step.soft);

  if (hasBlockingFailure) {
    process.exit(1);
  }

  if (hasSoftFailure) {
    process.exit(2);
  }
}

export function runCommand(
  command,
  args,
  {
    cwd = process.cwd(),
    env = process.env,
    step,
    allowFailure = false,
    stdout = "inherit",
    stderr = "inherit",
  } = {},
) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: ["inherit", stdout, stderr],
    encoding: "utf8",
  });

  if (step) {
    step.durationMs = Date.now() - startedAt;
    step.code = result.status ?? 1;
    step.status = result.status === 0 ? "passed" : "failed";
  }

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0 && !allowFailure) {
    const detail = `${command} ${args.join(" ")} exited with code ${result.status ?? 1}`;

    if (step) {
      step.details = detail;
    }

    throw new Error(detail);
  }

  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export async function waitForHttpReady({
  url,
  timeoutMs = 120_000,
  intervalMs = 1_000,
}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "server did not start";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "follow" });

      if (response.ok) {
        return response;
      }

      lastError = `received HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

export function parseRouteExpectations(rawValue) {
  if (!rawValue) {
    return DEFAULT_ROUTE_EXPECTATIONS;
  }

  return JSON.parse(rawValue);
}

export function isObviousFailure(body) {
  const normalized = body.toLowerCase();

  return [
    "application error",
    "internal server error",
    "unexpected application error",
    "error digest",
    "500 -",
    "500 internal server error",
    "this page could not be found",
  ].some((token) => normalized.includes(token));
}

export async function probeRoutes({ baseUrl, stage, routes = DEFAULT_ROUTE_EXPECTATIONS }) {
  const results = [];

  for (const route of routes) {
    const targetUrl = new URL(route.path, baseUrl).toString();
    const response = await fetch(targetUrl, { redirect: "follow" });
    const body = await response.text();
    const missing = [];

    for (const token of route.expected ?? []) {
      if (!body.includes(token)) {
        missing.push(token);
      }
    }

    for (const token of route.signedOutExpected ?? []) {
      if (!body.includes(token)) {
        missing.push(token);
      }
    }

    results.push({
      path: route.path,
      url: targetUrl,
      ok: response.ok && !isObviousFailure(body) && missing.length === 0,
      status: response.status,
      missing,
    });
  }

  const failed = results.filter((result) => !result.ok);

  if (failed.length > 0) {
    const lines = failed.map((result) => {
      const missing = result.missing.length > 0 ? `; missing markers: ${result.missing.join(", ")}` : "";
      return `${stage} route probe failed for ${result.path} with HTTP ${result.status}${missing}`;
    });

    throw new Error(lines.join("\n"));
  }

  return results;
}

export function findPortOwners(port = DEFAULT_PORT) {
  const result = spawnSync("lsof", ["-ti", `tcp:${port}`], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });

  if (result.error || (result.status !== 0 && !result.stdout.trim())) {
    return [];
  }

  return result.stdout
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function killProcesses(pids) {
  if (pids.length === 0) {
    return;
  }

  runCommand("kill", pids, { allowFailure: false });
}

export function startDevServer({
  cwd = process.cwd(),
  env = process.env,
  host = DEFAULT_LOCAL_HOST,
} = {}) {
  return spawn("npm", ["run", "dev", "--", "--hostname", host], {
    cwd,
    env,
    stdio: "inherit",
  });
}
