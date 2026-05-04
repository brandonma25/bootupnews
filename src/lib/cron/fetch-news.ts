import { generateDailyBriefing } from "@/lib/data";
import { demoTopics } from "@/lib/demo-data";
import { logServerEvent } from "@/lib/observability";
import {
  captureRssCronCheckIn,
  captureRssFailure,
  withRssSpan,
} from "@/lib/observability/rss";
import { persistSignalPostsForBriefing } from "@/lib/signals-editorial";
import { getPublicSourcePlanForSurface, getRequiredSourcesForPublicSurface } from "@/lib/source-manifest";
import type { BriefingItem } from "@/lib/types";
import { validateWhyItMatters } from "@/lib/why-it-matters-quality-gate";

const CRON_ROUTE = "/api/cron/fetch-news";
const SIGNAL_POST_CANDIDATE_DEPTH_LIMIT = 8;

export type DailyNewsCronDiagnosticStage =
  | "route_start"
  | "auth_check"
  | "env_check"
  | "source_manifest_load"
  | "pipeline_start"
  | "source_fetch_start"
  | "source_fetch_complete"
  | "ranking_selection_start"
  | "ranking_selection_complete"
  | "witm_validation_start"
  | "witm_validation_complete"
  | "persistence_start"
  | "persistence_complete"
  | "health_update_start"
  | "health_update_complete"
  | "route_success"
  | "route_failure";

type DiagnosticLogLevel = "info" | "warn" | "error";

type DailyNewsCronDiagnosticContext = {
  request_id: string;
  route: string;
  method: string;
  started_at: string;
  runtime: "nodejs";
  environment: string;
  deployment_commit: string | null;
  vercel_region: string | null;
  env?: Record<string, boolean>;
};

export type DailyNewsCronDiagnostics = DailyNewsCronDiagnosticContext & {
  stages_seen: DailyNewsCronDiagnosticStage[];
  auth?: {
    authorization_header_present: boolean;
    cron_secret_present: boolean;
    auth_passed: boolean;
  };
  source_manifest?: {
    surface: "public.home";
    source_count: number;
    enabled_public_source_count: number;
    required_source_count: number;
    supplied_by_manifest: boolean;
    warnings: string[];
  };
  source_fetch?: {
    raw_item_count: number;
    source_success_count: number;
    source_failure_count: number;
    retry_exhausted_sources: string[];
  };
  ranking_selection?: {
    ranked_item_count: number;
    selected_briefing_item_count: number;
    core_count: number;
    context_count: number;
    depth_count: number;
    candidate_pool_insufficient: boolean;
    seed_fallback: boolean;
  };
  witm_validation?: {
    pass_count: number;
    requires_human_rewrite_count: number;
    invalid_generic_or_fallback_failure_count: number;
  };
  persistence?: {
    write_mode: "normal";
    target_tables: string[];
    draft_review_intent: boolean;
    public_publish_attempted: boolean;
    rows_attempted: number;
    rows_inserted_or_updated: number;
    error_message: string | null;
  };
  health_update?: {
    mode: "derived_from_signal_posts_created_at";
    explicit_update_attempted: false;
    updated_timestamp: string | null;
    error_message: string | null;
  };
  failed_stage: DailyNewsCronDiagnosticStage | null;
  error_name: string | null;
  sanitized_error_message: string | null;
  sanitized_stack_top: string | null;
  elapsed_ms: number;
};

export type DailyNewsCronRunSummary = {
  briefingDate: string | null;
  insertedSignalPostCount: number;
  pipelineRunId: string | null;
  rawItemCount: number;
  clusterCount: number;
  rankedClusterCount: number;
  usedSeedFallback: boolean;
  feedFailureCount: number;
  message: string;
};

export type DailyNewsCronRunResult = {
  success: boolean;
  ok: boolean;
  request_id: string;
  timestamp: string;
  summary: DailyNewsCronRunSummary;
  failed_stage: DailyNewsCronDiagnosticStage | null;
  error_name: string | null;
  sanitized_error_message: string | null;
  elapsed_ms: number;
  diagnostics: DailyNewsCronDiagnostics;
};

export type DailyNewsCronRunContext = {
  requestId?: string;
  route?: string;
  method?: string;
  startedAtMs?: number;
  envPresence?: Record<string, boolean>;
  auth?: DailyNewsCronDiagnostics["auth"];
  initialStages?: DailyNewsCronDiagnosticStage[];
};

export function createDailyNewsCronRequestId(candidate?: string | null) {
  const normalized = candidate?.trim();

  if (normalized) {
    return normalized;
  }

  const randomSuffix =
    globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `cron-${Date.now()}-${randomSuffix}`;
}

export function collectDailyNewsCronEnvPresence() {
  const supabaseAnonPresent = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const supabasePublishablePresent = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());

  return {
    CRON_SECRET: Boolean(process.env.CRON_SECRET?.trim()),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY_OR_PUBLISHABLE_KEY: supabaseAnonPresent || supabasePublishablePresent,
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

export function collectDailyNewsCronDeploymentContext() {
  return {
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    deployment_commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    vercel_region: process.env.VERCEL_REGION || process.env.AWS_REGION || null,
  };
}

export function sanitizeDiagnosticMessage(input: unknown) {
  const raw = input instanceof Error ? input.message : String(input ?? "");
  const knownSecretValues = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.OPENAI_API_KEY,
  ].filter((value): value is string => Boolean(value && value.trim().length >= 4));

  return knownSecretValues
    .reduce(
      (message, value) => message.replace(new RegExp(escapeRegExp(value.trim()), "g"), "[REDACTED_SECRET]"),
      raw,
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/(authorization|cron_secret|supabase_service_role_key)\s*[:=]\s*[^,\s;]+/gi, "$1=[REDACTED]");
}

export function logDailyNewsCronDiagnostic(
  level: DiagnosticLogLevel,
  stage: DailyNewsCronDiagnosticStage,
  context: Pick<DailyNewsCronDiagnostics, "request_id" | "route">,
  details: Record<string, unknown> = {},
) {
  logServerEvent(level, "Daily news cron diagnostic stage", {
    component: "daily_news_cron",
    request_id: context.request_id,
    route: context.route,
    stage,
    ...details,
  });
}

function buildFailureResult(
  timestamp: string,
  message: string,
  diagnostics: DailyNewsCronDiagnostics,
): DailyNewsCronRunResult {
  const sanitizedMessage = sanitizeDiagnosticMessage(message);

  return buildRunResult({
    success: false,
    timestamp,
    diagnostics,
    summary: {
      briefingDate: null,
      insertedSignalPostCount: 0,
      pipelineRunId: null,
      rawItemCount: 0,
      clusterCount: 0,
      rankedClusterCount: 0,
      usedSeedFallback: false,
      feedFailureCount: 0,
      message: sanitizedMessage,
    },
  });
}

export async function runDailyNewsCron(context: DailyNewsCronRunContext = {}): Promise<DailyNewsCronRunResult> {
  const timestamp = new Date().toISOString();
  const startedAtMs = context.startedAtMs ?? Date.now();
  const startedAtIso = new Date(startedAtMs).toISOString();
  const deployment = collectDailyNewsCronDeploymentContext();
  const diagnostics: DailyNewsCronDiagnostics = {
    request_id: context.requestId ?? createDailyNewsCronRequestId(),
    route: context.route ?? CRON_ROUTE,
    method: context.method ?? "GET",
    started_at: startedAtIso,
    runtime: "nodejs",
    environment: deployment.environment,
    deployment_commit: deployment.deployment_commit,
    vercel_region: deployment.vercel_region,
    env: context.envPresence ?? collectDailyNewsCronEnvPresence(),
    auth: context.auth,
    stages_seen: context.initialStages?.slice() ?? [],
    failed_stage: null,
    error_name: null,
    sanitized_error_message: null,
    sanitized_stack_top: null,
    elapsed_ms: 0,
  };
  let currentStage: DailyNewsCronDiagnosticStage = "pipeline_start";
  const checkInId = captureRssCronCheckIn("in_progress");

  logServerEvent("info", "Daily news cron started", {
    route: diagnostics.route,
    request_id: diagnostics.request_id,
    timestamp,
  });

  try {
    currentStage = markStage(diagnostics, "source_manifest_load");
    const sourcePlan = getPublicSourcePlanForSurface("public.home");
    const sources = getRequiredSourcesForPublicSurface("public.home");
    diagnostics.source_manifest = {
      surface: "public.home",
      source_count: sourcePlan.sourceCount,
      enabled_public_source_count: sourcePlan.sources.filter(
        (source) => source.publicEligible && source.status === "active",
      ).length,
      required_source_count: sources.length,
      supplied_by_manifest: sourcePlan.suppliedByManifest,
      warnings: sourcePlan.warnings,
    };
    logDailyNewsCronDiagnostic("info", "source_manifest_load", diagnostics, diagnostics.source_manifest);

    currentStage = markStage(diagnostics, "pipeline_start");
    logDailyNewsCronDiagnostic("info", "pipeline_start", diagnostics, {
      source_count: sources.length,
    });

    currentStage = markStage(diagnostics, "source_fetch_start");
    logDailyNewsCronDiagnostic("info", "source_fetch_start", diagnostics, {
      source_count: sources.length,
    });
    const { briefing, publicRankedItems, pipelineRun } = await withRssSpan(
      "rss.refresh",
      "refresh",
      {
        route: diagnostics.route,
        request_id: diagnostics.request_id,
      },
      () => generateDailyBriefing(demoTopics, sources, { suppliedByManifest: sourcePlan.suppliedByManifest }),
    );
    const feedFailures = pipelineRun.feed_failures ?? [];
    diagnostics.source_fetch = {
      raw_item_count: pipelineRun.num_raw_items,
      source_success_count: Math.max(0, sources.length - feedFailures.length),
      source_failure_count: feedFailures.length,
      retry_exhausted_sources: feedFailures
        .filter((failure) => `${failure.failure_type ?? ""} ${failure.error}`.toLowerCase().includes("retry"))
        .map((failure) => failure.source),
    };
    markStage(diagnostics, "source_fetch_complete");
    logDailyNewsCronDiagnostic("info", "source_fetch_complete", diagnostics, diagnostics.source_fetch);

    currentStage = markStage(diagnostics, "ranking_selection_start");
    logDailyNewsCronDiagnostic("info", "ranking_selection_start", diagnostics, {
      raw_item_count: pipelineRun.num_raw_items,
      cluster_count: pipelineRun.num_clusters,
      ranked_item_count: publicRankedItems.length,
    });

    const roleCounts = countBriefingSignalRoles(briefing.items);
    diagnostics.ranking_selection = {
      ranked_item_count: publicRankedItems.length,
      selected_briefing_item_count: briefing.items.length,
      core_count: roleCounts.coreCount,
      context_count: roleCounts.contextCount,
      depth_count: roleCounts.depthCount,
      candidate_pool_insufficient: briefing.items.length < 5,
      seed_fallback: pipelineRun.used_seed_fallback,
    };
    markStage(diagnostics, "ranking_selection_complete");
    logDailyNewsCronDiagnostic("info", "ranking_selection_complete", diagnostics, diagnostics.ranking_selection);

    currentStage = markStage(diagnostics, "witm_validation_start");
    logDailyNewsCronDiagnostic("info", "witm_validation_start", diagnostics, {
      selected_briefing_item_count: briefing.items.length,
    });
    diagnostics.witm_validation = summarizeWhyItMattersValidation(briefing.items);
    markStage(diagnostics, "witm_validation_complete");
    logDailyNewsCronDiagnostic("info", "witm_validation_complete", diagnostics, diagnostics.witm_validation);

    const briefingDate = briefing.briefingDate.slice(0, 10);
    const baseSummary = {
      briefingDate,
      insertedSignalPostCount: 0,
      pipelineRunId: pipelineRun.run_id,
      rawItemCount: pipelineRun.num_raw_items,
      clusterCount: pipelineRun.num_clusters,
      rankedClusterCount: publicRankedItems.length,
      usedSeedFallback: pipelineRun.used_seed_fallback,
      feedFailureCount: feedFailures.length,
    };

    if (pipelineRun.used_seed_fallback) {
      const result = buildRunResult({
        success: false,
        timestamp,
        diagnostics: markFailure(
          diagnostics,
          "ranking_selection_complete",
          "SeedFallbackBlocked",
          "Cron run skipped editorial persistence because live feeds fell back to deterministic seed data.",
        ),
        summary: {
          ...baseSummary,
          message: "Cron run skipped editorial persistence because live feeds fell back to deterministic seed data.",
        },
      });

      logServerEvent("warn", "Daily news cron skipped seed fallback output", {
        route: diagnostics.route,
        request_id: diagnostics.request_id,
        ...result.summary,
      });
      captureRssFailure(new Error(result.summary.message), {
        failureType: "rss_refresh_job_failed",
        phase: "refresh",
        level: "error",
        retryCount: feedFailures.length,
        message: result.summary.message,
        extra: {
          route: diagnostics.route,
          request_id: diagnostics.request_id,
          pipelineRunId: pipelineRun.run_id,
          usedSeedFallback: true,
          feedFailureCount: feedFailures.length,
        },
      });
      captureRssCronCheckIn("error", checkInId, durationSeconds(startedAtMs));

      return result;
    }

    if (briefing.items.length < 5) {
      const message = `Cron run produced ${briefing.items.length} ranked briefing items; at least five are required for editorial review.`;
      const result = buildRunResult({
        success: false,
        timestamp,
        diagnostics: markFailure(diagnostics, "ranking_selection_complete", "CandidatePoolInsufficient", message),
        summary: {
          ...baseSummary,
          message,
        },
      });

      logServerEvent("warn", "Daily news cron produced too few items", {
        route: diagnostics.route,
        request_id: diagnostics.request_id,
        ...result.summary,
        briefingItemCount: briefing.items.length,
      });
      captureRssFailure(new Error(result.summary.message), {
        failureType: "rss_refresh_job_failed",
        phase: "refresh",
        level: "error",
        message: result.summary.message,
        extra: {
          route: diagnostics.route,
          request_id: diagnostics.request_id,
          pipelineRunId: pipelineRun.run_id,
          briefingItemCount: briefing.items.length,
          feedFailureCount: feedFailures.length,
        },
      });
      captureRssCronCheckIn("error", checkInId, durationSeconds(startedAtMs));

      return result;
    }

    currentStage = markStage(diagnostics, "persistence_start");
    diagnostics.persistence = {
      write_mode: "normal",
      target_tables: ["signal_posts"],
      draft_review_intent: true,
      public_publish_attempted: false,
      rows_attempted: Math.min(briefing.items.length, SIGNAL_POST_CANDIDATE_DEPTH_LIMIT),
      rows_inserted_or_updated: 0,
      error_message: null,
    };
    logDailyNewsCronDiagnostic("info", "persistence_start", diagnostics, diagnostics.persistence);

    const snapshot = await persistSignalPostsForBriefing({
      briefingDate,
      items: briefing.items,
    });
    const sanitizedSnapshotMessage = sanitizeDiagnosticMessage(snapshot.message);
    diagnostics.persistence = {
      ...diagnostics.persistence,
      rows_inserted_or_updated: snapshot.insertedCount,
      error_message: snapshot.ok ? null : sanitizedSnapshotMessage,
    };
    markStage(diagnostics, "persistence_complete");
    logDailyNewsCronDiagnostic(snapshot.ok ? "info" : "error", "persistence_complete", diagnostics, diagnostics.persistence);

    currentStage = markStage(diagnostics, "health_update_start");
    logDailyNewsCronDiagnostic("info", "health_update_start", diagnostics, {
      mode: "derived_from_signal_posts_created_at",
      explicit_update_attempted: false,
    });
    diagnostics.health_update = {
      mode: "derived_from_signal_posts_created_at",
      explicit_update_attempted: false,
      updated_timestamp: snapshot.ok && snapshot.insertedCount > 0 ? new Date().toISOString() : null,
      error_message: null,
    };
    markStage(diagnostics, "health_update_complete");
    logDailyNewsCronDiagnostic("info", "health_update_complete", diagnostics, diagnostics.health_update);

    if (!snapshot.ok) {
      markFailure(diagnostics, "persistence_complete", "PersistenceFailed", sanitizedSnapshotMessage);
    }

    const result = buildRunResult({
      success: snapshot.ok,
      timestamp,
      diagnostics,
      summary: {
        ...baseSummary,
        insertedSignalPostCount: snapshot.insertedCount,
        message: sanitizedSnapshotMessage,
      },
    });

    logServerEvent(snapshot.ok ? "info" : "error", snapshot.ok ? "Daily news cron succeeded" : "Daily news cron failed", {
      route: diagnostics.route,
      request_id: diagnostics.request_id,
      ...result.summary,
    });

    if (!snapshot.ok) {
      captureRssFailure(new Error("RSS signal post persistence failed during daily refresh."), {
        failureType: "rss_cache_write_failed",
        phase: "store",
        level: "error",
        message: "RSS signal post persistence failed during daily refresh.",
        extra: {
          route: diagnostics.route,
          request_id: diagnostics.request_id,
          pipelineRunId: pipelineRun.run_id,
          briefingDate,
          operation: "persist_signal_posts",
        },
      });
    }

    captureRssCronCheckIn(snapshot.ok ? "ok" : "error", checkInId, durationSeconds(startedAtMs));

    return result;
  } catch (error) {
    const sanitizedMessage = sanitizeDiagnosticMessage(error);
    const errorName = error instanceof Error ? error.name : "CronExecutionError";
    const result = buildFailureResult(
      timestamp,
      "Daily news cron failed before completion.",
      markFailure(diagnostics, currentStage, errorName, sanitizedMessage, error),
    );

    logServerEvent("error", "Daily news cron failed", {
      route: diagnostics.route,
      request_id: diagnostics.request_id,
      timestamp,
      errorName,
      errorMessage: sanitizedMessage,
      errorStackTop: diagnostics.sanitized_stack_top,
    });
    captureRssFailure(new Error(sanitizedMessage), {
      failureType: "rss_refresh_job_failed",
      phase: "refresh",
      level: "error",
      message: result.summary.message,
      extra: {
        route: diagnostics.route,
        request_id: diagnostics.request_id,
        failedStage: diagnostics.failed_stage,
      },
    });
    captureRssCronCheckIn("error", checkInId, durationSeconds(startedAtMs));

    return result;
  } finally {
    diagnostics.elapsed_ms = Date.now() - startedAtMs;
  }
}

function buildRunResult(input: {
  success: boolean;
  timestamp: string;
  summary: DailyNewsCronRunSummary;
  diagnostics: DailyNewsCronDiagnostics;
}): DailyNewsCronRunResult {
  input.diagnostics.elapsed_ms = Date.now() - Date.parse(input.diagnostics.started_at);

  return {
    success: input.success,
    ok: input.success,
    request_id: input.diagnostics.request_id,
    timestamp: input.timestamp,
    summary: input.summary,
    failed_stage: input.diagnostics.failed_stage,
    error_name: input.diagnostics.error_name,
    sanitized_error_message: input.diagnostics.sanitized_error_message,
    elapsed_ms: input.diagnostics.elapsed_ms,
    diagnostics: input.diagnostics,
  };
}

function markStage(diagnostics: DailyNewsCronDiagnostics, stage: DailyNewsCronDiagnosticStage) {
  if (!diagnostics.stages_seen.includes(stage)) {
    diagnostics.stages_seen.push(stage);
  }

  return stage;
}

function markFailure(
  diagnostics: DailyNewsCronDiagnostics,
  failedStage: DailyNewsCronDiagnosticStage,
  errorName: string,
  message: string,
  error?: unknown,
) {
  markStage(diagnostics, failedStage);
  diagnostics.failed_stage = failedStage;
  diagnostics.error_name = errorName;
  diagnostics.sanitized_error_message = sanitizeDiagnosticMessage(message);
  diagnostics.sanitized_stack_top = sanitizeStackTop(error);

  return diagnostics;
}

function countBriefingSignalRoles(items: BriefingItem[]) {
  return items.reduce(
    (counts, item, index) => {
      if (item.signalRole === "core") {
        counts.coreCount += 1;
      } else if (item.signalRole === "context") {
        counts.contextCount += 1;
      } else if (item.signalRole === "watch") {
        counts.depthCount += 1;
      } else if (index < 5) {
        counts.coreCount += 1;
      } else if (index < 7) {
        counts.contextCount += 1;
      } else {
        counts.depthCount += 1;
      }

      return counts;
    },
    { coreCount: 0, contextCount: 0, depthCount: 0 },
  );
}

function summarizeWhyItMattersValidation(items: BriefingItem[]) {
  return items.reduce(
    (counts, item) => {
      const validation = item.whyItMattersValidation ?? validateWhyItMatters(item.aiWhyItMatters ?? item.whyItMatters ?? "");

      if (validation.passed) {
        counts.pass_count += 1;
        return counts;
      }

      counts.requires_human_rewrite_count += 1;

      const failureText = [...validation.failures, ...validation.failureDetails].join(" ").toLowerCase();

      if (
        /fallback|generic|placeholder|template|source review|editorial review|unsupported_structural_claim|specificity/.test(
          failureText,
        )
      ) {
        counts.invalid_generic_or_fallback_failure_count += 1;
      }

      return counts;
    },
    {
      pass_count: 0,
      requires_human_rewrite_count: 0,
      invalid_generic_or_fallback_failure_count: 0,
    },
  );
}

function sanitizeStackTop(error: unknown) {
  if (!(error instanceof Error) || !error.stack) {
    return null;
  }

  return error.stack
    .split("\n")
    .slice(0, 2)
    .map((line) => sanitizeDiagnosticMessage(line.trim()))
    .join("\n");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function durationSeconds(startedAtMs: number) {
  return Number(((Date.now() - startedAtMs) / 1000).toFixed(3));
}
