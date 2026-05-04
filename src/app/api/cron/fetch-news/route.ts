import { NextResponse } from "next/server";

import {
  collectDailyNewsCronDeploymentContext,
  collectDailyNewsCronEnvPresence,
  createDailyNewsCronRequestId,
  logDailyNewsCronDiagnostic,
  runDailyNewsCron,
  sanitizeDiagnosticMessage,
  type DailyNewsCronDiagnostics,
} from "@/lib/cron/fetch-news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/fetch-news";

function getAuthorizationState(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  const cronSecretPresent = Boolean(cronSecret);
  const authorizationHeaderPresent = Boolean(authHeader);

  return {
    cronSecretPresent,
    authorizationHeaderPresent,
    authPassed: cronSecretPresent && authHeader === `Bearer ${cronSecret}`,
  };
}

function buildRouteDiagnostics({
  request,
  requestId,
  startedAtMs,
}: {
  request: Request;
  requestId: string;
  startedAtMs: number;
}): DailyNewsCronDiagnostics {
  const deployment = collectDailyNewsCronDeploymentContext();

  return {
    request_id: requestId,
    route: ROUTE,
    method: request.method,
    started_at: new Date(startedAtMs).toISOString(),
    runtime: "nodejs",
    environment: deployment.environment,
    deployment_commit: deployment.deployment_commit,
    vercel_region: deployment.vercel_region,
    env: collectDailyNewsCronEnvPresence(),
    stages_seen: ["route_start"],
    failed_stage: null,
    error_name: null,
    sanitized_error_message: null,
    sanitized_stack_top: null,
    elapsed_ms: 0,
  };
}

function buildUnauthorizedResponse(diagnostics: DailyNewsCronDiagnostics) {
  diagnostics.failed_stage = "auth_check";
  diagnostics.error_name = "UnauthorizedCronRequest";
  diagnostics.sanitized_error_message = sanitizeDiagnosticMessage("Unauthorized");
  diagnostics.elapsed_ms = Date.now() - Date.parse(diagnostics.started_at);

  return NextResponse.json(
    {
      success: false,
      ok: false,
      request_id: diagnostics.request_id,
      timestamp: new Date().toISOString(),
      failed_stage: diagnostics.failed_stage,
      error_name: diagnostics.error_name,
      sanitized_error_message: diagnostics.sanitized_error_message,
      elapsed_ms: diagnostics.elapsed_ms,
      summary: {
        message: "Unauthorized",
      },
      diagnostics,
    },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const startedAtMs = Date.now();
  const requestId = createDailyNewsCronRequestId(request.headers.get("x-vercel-id"));
  const routeDiagnostics = buildRouteDiagnostics({ request, requestId, startedAtMs });

  logDailyNewsCronDiagnostic("info", "route_start", routeDiagnostics, {
    timestamp: routeDiagnostics.started_at,
    runtime: routeDiagnostics.runtime,
    environment: routeDiagnostics.environment,
    deployment_commit: routeDiagnostics.deployment_commit,
    vercel_region: routeDiagnostics.vercel_region,
    method: request.method,
  });

  const auth = getAuthorizationState(request);
  routeDiagnostics.auth = {
    authorization_header_present: auth.authorizationHeaderPresent,
    cron_secret_present: auth.cronSecretPresent,
    auth_passed: auth.authPassed,
  };
  routeDiagnostics.stages_seen.push("auth_check");
  logDailyNewsCronDiagnostic(auth.authPassed ? "info" : "warn", "auth_check", routeDiagnostics, routeDiagnostics.auth);

  if (!auth.authPassed) {
    logDailyNewsCronDiagnostic("warn", "route_failure", routeDiagnostics, {
      failed_stage: "auth_check",
      error_name: "UnauthorizedCronRequest",
    });

    return buildUnauthorizedResponse(routeDiagnostics);
  }

  routeDiagnostics.stages_seen.push("env_check");
  logDailyNewsCronDiagnostic("info", "env_check", routeDiagnostics, {
    required_env_present: routeDiagnostics.env,
    missing_env_names: Object.entries(routeDiagnostics.env ?? {})
      .filter(([, present]) => !present)
      .map(([name]) => name),
  });

  const result = await runDailyNewsCron({
    requestId,
    route: ROUTE,
    method: request.method,
    startedAtMs,
    envPresence: routeDiagnostics.env,
    auth: routeDiagnostics.auth,
    initialStages: routeDiagnostics.stages_seen,
  });

  logDailyNewsCronDiagnostic(result.success ? "info" : "error", result.success ? "route_success" : "route_failure", result.diagnostics, {
    elapsed_ms: result.elapsed_ms,
    failed_stage: result.failed_stage,
    error_name: result.error_name,
    summary: {
      briefingDate: result.summary.briefingDate,
      insertedSignalPostCount: result.summary.insertedSignalPostCount,
      rawItemCount: result.summary.rawItemCount,
      rankedClusterCount: result.summary.rankedClusterCount,
      usedSeedFallback: result.summary.usedSeedFallback,
      feedFailureCount: result.summary.feedFailureCount,
    },
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
