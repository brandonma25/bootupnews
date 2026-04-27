import * as Sentry from "@sentry/nextjs";

import { logServerEvent } from "@/lib/observability";
import {
  getUrlHost,
  isSentryConfigured,
  readSentryEnvironment,
  sanitizeUrl,
} from "@/lib/sentry-config";

export const RSS_FAILURE_TYPES = [
  "rss_config_missing",
  "rss_config_invalid",
  "rss_boot_init_failed",
  "rss_fetch_timeout",
  "rss_fetch_network_error",
  "rss_fetch_dns_error",
  "rss_fetch_tls_error",
  "rss_fetch_http_error",
  "rss_fetch_rate_limited",
  "rss_fetch_unexpected_status",
  "rss_fetch_empty_response",
  "rss_fetch_invalid_content_type",
  "rss_parse_invalid_xml",
  "rss_parse_invalid_feed",
  "rss_parse_missing_required_fields",
  "rss_parse_empty_feed",
  "rss_cache_read_failed",
  "rss_cache_write_failed",
  "rss_retry_exhausted",
  "rss_refresh_job_failed",
  "rss_feed_stale",
  "rss_unknown_error",
] as const;

export type RssFailureType = (typeof RSS_FAILURE_TYPES)[number];
export type RssPhase =
  | "boot"
  | "fetch"
  | "parse"
  | "cache"
  | "store"
  | "publish"
  | "refresh"
  | "healthcheck"
  | "render";
export type RssCaptureLevel = "warning" | "error" | "fatal";

type RssFailureContext = {
  failureType?: RssFailureType;
  phase: RssPhase;
  feedUrl?: string;
  feedName?: string;
  feedId?: string;
  statusCode?: number;
  retryCount?: number;
  retryAttempt?: number;
  timeoutMs?: number;
  parser?: string;
  boot?: boolean;
  staleThresholdMs?: number;
  level?: RssCaptureLevel;
  message?: string;
  durationMs?: number;
  extra?: Record<string, unknown>;
};

type RssFailureSnapshot = {
  failure_type: RssFailureType;
  phase: RssPhase;
  feed_host: string;
  feed_id: string | null;
  feed_name: string | null;
  status_code?: number;
  retry_count?: number;
  timeout_ms?: number;
  level: RssCaptureLevel;
  last_seen_at: string;
};

type RssFeedHealth = {
  feed_host: string;
  feed_id: string | null;
  feed_name: string | null;
  last_successful_fetch_at: string | null;
  last_failure_at: string | null;
  last_failure_type: RssFailureType | null;
  critical: boolean;
};

type RssRuntimeState = {
  bootStartedAt: string | null;
  bootCompletedAt: string | null;
  bootStatus: "unknown" | "ok" | "degraded" | "failed";
  criticalFailure: boolean;
  lastSuccessfulFetchAt: string | null;
  lastHealthFailureCapturedAt: string | null;
  failures: RssFailureSnapshot[];
  feeds: Map<string, RssFeedHealth>;
};

declare global {
  var __bootUpRssRuntimeState: RssRuntimeState | undefined;
}

const CAPTURED_RSS_ERROR = Symbol.for("bootup.rss.sentryCaptured");
const DEFAULT_STALE_THRESHOLD_MS = 30 * 60 * 60 * 1000;
const MAX_FAILURES = 25;
const RSS_CRON_MONITOR_SCHEDULE = "0 10 * * *";

export class RssError extends Error {
  failureType: RssFailureType;
  phase: RssPhase;
  feedUrl?: string;
  feedName?: string;
  feedId?: string;
  statusCode?: number;
  retryCount?: number;
  retryAttempt?: number;
  timeoutMs?: number;

  constructor(message: string, context: RssFailureContext) {
    super(message);
    this.name = "RssError";
    this.failureType = context.failureType ?? "rss_unknown_error";
    this.phase = context.phase;
    this.feedUrl = context.feedUrl;
    this.feedName = context.feedName;
    this.feedId = context.feedId;
    this.statusCode = context.statusCode;
    this.retryCount = context.retryCount;
    this.retryAttempt = context.retryAttempt;
    this.timeoutMs = context.timeoutMs;
  }
}

export function createRssError(message: string, context: RssFailureContext) {
  return new RssError(message, context);
}

function getRuntimeState() {
  globalThis.__bootUpRssRuntimeState ??= {
    bootStartedAt: null,
    bootCompletedAt: null,
    bootStatus: "unknown",
    criticalFailure: false,
    lastSuccessfulFetchAt: null,
    lastHealthFailureCapturedAt: null,
    failures: [],
    feeds: new Map<string, RssFeedHealth>(),
  };

  return globalThis.__bootUpRssRuntimeState;
}

function getFeedKey(context: {
  feedUrl?: string;
  feedHost?: string;
  feedName?: string;
  feedId?: string;
}) {
  return context.feedId || context.feedHost || getUrlHost(context.feedUrl) || context.feedName || "rss-feed";
}

function registerFeed(context: {
  feedUrl?: string;
  feedHost?: string;
  feedName?: string;
  feedId?: string;
  critical?: boolean;
}) {
  const state = getRuntimeState();
  const feedHost = context.feedHost || getUrlHost(context.feedUrl) || "unknown";
  const key = getFeedKey({ ...context, feedHost });
  const existing = state.feeds.get(key);

  state.feeds.set(key, {
    feed_host: feedHost,
    feed_id: context.feedId ?? existing?.feed_id ?? null,
    feed_name: context.feedName ?? existing?.feed_name ?? null,
    last_successful_fetch_at: existing?.last_successful_fetch_at ?? null,
    last_failure_at: existing?.last_failure_at ?? null,
    last_failure_type: existing?.last_failure_type ?? null,
    critical: context.critical ?? existing?.critical ?? true,
  });
}

export function recordRssFetchSuccess(context: {
  feedUrl?: string;
  feedName?: string;
  feedId?: string;
  fetchedAt?: string;
}) {
  const state = getRuntimeState();
  const fetchedAt = context.fetchedAt ?? new Date().toISOString();
  const feedHost = getUrlHost(context.feedUrl) || "unknown";
  const key = getFeedKey({ ...context, feedHost });
  const existing = state.feeds.get(key);

  state.lastSuccessfulFetchAt = latestTimestamp(state.lastSuccessfulFetchAt, fetchedAt);
  state.feeds.set(key, {
    feed_host: feedHost,
    feed_id: context.feedId ?? existing?.feed_id ?? null,
    feed_name: context.feedName ?? existing?.feed_name ?? null,
    last_successful_fetch_at: fetchedAt,
    last_failure_at: existing?.last_failure_at ?? null,
    last_failure_type: existing?.last_failure_type ?? null,
    critical: existing?.critical ?? true,
  });
}

function recordRssFailure(context: Required<Pick<RssFailureContext, "phase">> & RssFailureContext) {
  const state = getRuntimeState();
  const failureType = context.failureType ?? "rss_unknown_error";
  const level = context.level ?? levelForFailure(failureType);
  const lastSeenAt = new Date().toISOString();
  const feedHost = getUrlHost(context.feedUrl) || "unknown";
  const key = getFeedKey({ ...context, feedHost });
  const existing = state.feeds.get(key);
  const failure: RssFailureSnapshot = {
    failure_type: failureType,
    phase: context.phase,
    feed_host: feedHost,
    feed_id: context.feedId ?? existing?.feed_id ?? null,
    feed_name: context.feedName ?? existing?.feed_name ?? null,
    level,
    last_seen_at: lastSeenAt,
  };

  if (context.statusCode) {
    failure.status_code = context.statusCode;
  }

  if (typeof context.retryCount === "number") {
    failure.retry_count = context.retryCount;
  }

  if (typeof context.timeoutMs === "number") {
    failure.timeout_ms = context.timeoutMs;
  }

  state.failures = [failure, ...state.failures].slice(0, MAX_FAILURES);
  state.feeds.set(key, {
    feed_host: feedHost,
    feed_id: failure.feed_id,
    feed_name: failure.feed_name,
    last_successful_fetch_at: existing?.last_successful_fetch_at ?? null,
    last_failure_at: lastSeenAt,
    last_failure_type: failureType,
    critical: existing?.critical ?? true,
  });

  if (level === "fatal") {
    state.criticalFailure = true;
  }
}

export function classifyRssFailure(error: unknown, fallback: RssFailureType = "rss_unknown_error"): RssFailureType {
  if (error instanceof RssError) {
    return error.failureType;
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();
  const errorWithCause = error as Error & { cause?: { code?: string } };
  const causeCode = errorWithCause.cause?.code?.toLowerCase() ?? "";

  if (error.name === "AbortError" || /timed out|timeout/.test(message)) {
    return "rss_fetch_timeout";
  }

  if (/enotfound|eai_again|getaddrinfo|dns/.test(message) || /enotfound|eai_again/.test(causeCode)) {
    return "rss_fetch_dns_error";
  }

  if (/tls|ssl|certificate|cert_has_expired|self[- ]signed/.test(message) || /tls|ssl|cert/.test(causeCode)) {
    return "rss_fetch_tls_error";
  }

  if (/status 429|rate limit|too many requests/.test(message)) {
    return "rss_fetch_rate_limited";
  }

  if (/status [45]\d\d|http/.test(message)) {
    return "rss_fetch_http_error";
  }

  if (/fetch failed|network|econnrefused|econnreset|socket|und_err/.test(message) || causeCode.startsWith("econn")) {
    return "rss_fetch_network_error";
  }

  if (/empty response|zero bytes/.test(message)) {
    return "rss_fetch_empty_response";
  }

  if (/content-type|content type/.test(message)) {
    return "rss_fetch_invalid_content_type";
  }

  if (/xml|non-whitespace before first tag|unexpected close tag|unclosed root tag/.test(message)) {
    return "rss_parse_invalid_xml";
  }

  if (/invalid feed|missing channel|missing rss|missing atom/.test(message)) {
    return "rss_parse_invalid_feed";
  }

  if (/missing required/.test(message)) {
    return "rss_parse_missing_required_fields";
  }

  if (/empty feed|zero articles|no items/.test(message)) {
    return "rss_parse_empty_feed";
  }

  return fallback;
}

export function captureRssFailure(error: unknown, context: RssFailureContext) {
  const failureType = context.failureType ?? classifyRssFailure(error);
  const normalizedContext = normalizeRssContext({
    ...context,
    failureType,
    level: context.level ?? levelForFailure(failureType),
  });

  recordRssFailure(normalizedContext);
  logRssEvent(
    normalizedContext.level === "warning" ? "warn" : "error",
    normalizedContext.message || "RSS failure captured",
    normalizedContext,
  );

  if (isMarkedCaptured(error) || !isSentryConfigured("server")) {
    return null;
  }

  markCaptured(error);

  return Sentry.withScope((scope) => {
    scope.setLevel(normalizedContext.level);
    scope.setTag("component", "rss");
    scope.setTag("rss.failure_type", failureType);
    scope.setTag("rss.phase", normalizedContext.phase);
    scope.setTag("rss.feed_host", normalizedContext.feed_host);

    if (normalizedContext.feed_id) {
      scope.setTag("rss.feed_id", normalizedContext.feed_id);
    }

    if (normalizedContext.feed_name) {
      scope.setTag("rss.feed_name", normalizedContext.feed_name);
    }

    scope.setTag("environment", readSentryEnvironment());
    scope.setContext("rss", normalizedContext);

    if (error instanceof Error) {
      return Sentry.captureException(error);
    }

    return Sentry.captureMessage(normalizedContext.message || String(error), normalizedContext.level);
  });
}

export function addRssBreadcrumb(message: string, context: Record<string, unknown> = {}) {
  logRssEvent("info", message, context);

  if (!isSentryConfigured("server")) {
    return;
  }

  Sentry.addBreadcrumb({
    category: "rss",
    level: "info",
    message,
    data: context,
  });
}

export async function withRssSpan<T>(
  name: string,
  phase: RssPhase,
  attributes: Record<string, string | number | boolean | null | undefined>,
  callback: () => Promise<T>,
) {
  if (!isSentryConfigured("server")) {
    return callback();
  }

  return Sentry.startSpan(
    {
      name,
      op: `rss.${phase}`,
      attributes: Object.fromEntries(
        Object.entries(attributes).filter((entry): entry is [string, string | number | boolean] => {
          const value = entry[1];
          return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
        }),
      ),
    },
    callback,
  );
}

export function captureRssCronCheckIn(
  status: "in_progress" | "ok" | "error",
  checkInId?: string,
  duration?: number,
) {
  if (!isSentryConfigured("server")) {
    return undefined;
  }

  const monitorSlug = process.env.RSS_CRON_MONITOR_SLUG?.trim() || "rss-feed-refresh";
  const checkIn: Parameters<typeof Sentry.captureCheckIn>[0] =
    status === "in_progress"
      ? {
          monitorSlug,
          status,
        }
      : checkInId
        ? {
            monitorSlug,
            status,
            checkInId,
            ...(typeof duration === "number" ? { duration } : {}),
          }
        : {
            monitorSlug,
            status,
          };

  return Sentry.captureCheckIn(
    checkIn,
    {
      schedule: {
        type: "crontab",
        value: RSS_CRON_MONITOR_SCHEDULE,
      },
      checkinMargin: 10,
      maxRuntime: 20,
      timezone: "UTC",
      failureIssueThreshold: 1,
      recoveryThreshold: 1,
    },
  );
}

export async function flushRssTelemetry(timeoutMs = 2000) {
  if (!isSentryConfigured("server")) {
    return true;
  }

  return Sentry.flush(timeoutMs);
}

export async function initializeRssMonitoringAtBoot() {
  const state = getRuntimeState();
  const startedAt = new Date().toISOString();
  state.bootStartedAt = startedAt;
  addRssBreadcrumb("rss boot started", { phase: "boot", bootStartedAt: startedAt });

  try {
    await withRssSpan("rss.boot", "boot", { "rss.boot": true }, async () => {
      const [{ getDefaultDonorFeeds, getProbationaryRuntimeFeeds }, { getSourcesForPublicSurface }] =
        await Promise.all([
          import("@/adapters/donors"),
          import("@/lib/source-manifest"),
        ]);
      const feeds = [
        ...getDefaultDonorFeeds().map((feed) => ({
          feedId: feed.id,
          feedName: feed.source,
          feedUrl: feed.fetch.feedUrl,
        })),
        ...getProbationaryRuntimeFeeds().map((feed) => ({
          feedId: feed.id,
          feedName: feed.source,
          feedUrl: feed.fetch.feedUrl,
        })),
        ...getSourcesForPublicSurface("public.home").map((source) => ({
          feedId: source.id,
          feedName: source.name,
          feedUrl: source.feedUrl,
        })),
      ];

      if (feeds.length === 0) {
        throw createRssError("RSS boot validation found no configured feeds.", {
          failureType: "rss_config_missing",
          phase: "boot",
          boot: true,
          level: "error",
        });
      }

      const invalidFeeds = feeds.filter((feed) => !isValidFeedUrl(feed.feedUrl));

      feeds.forEach((feed) => registerFeed({ ...feed, critical: true }));

      if (invalidFeeds.length > 0) {
        throw createRssError("RSS boot validation found invalid feed configuration.", {
          failureType: "rss_config_invalid",
          phase: "boot",
          boot: true,
          feedId: invalidFeeds[0]?.feedId,
          feedName: invalidFeeds[0]?.feedName,
          feedUrl: invalidFeeds[0]?.feedUrl,
          level: "error",
          extra: {
            invalidFeedCount: invalidFeeds.length,
          },
        });
      }
    });

    const completedAt = new Date().toISOString();
    state.bootCompletedAt = completedAt;
    state.bootStatus = "ok";
    addRssBreadcrumb("rss boot succeeded", { phase: "boot", bootCompletedAt: completedAt });
  } catch (error) {
    const completedAt = new Date().toISOString();
    state.bootCompletedAt = completedAt;
    state.bootStatus = "degraded";
    captureRssFailure(error, {
      failureType: classifyRssFailure(error, "rss_boot_init_failed"),
      phase: "boot",
      boot: true,
      level: "error",
      message: "RSS boot failed; app will continue with persisted or fallback data where available.",
    });
    addRssBreadcrumb("rss boot failed", { phase: "boot", bootCompletedAt: completedAt });
  }
}

export function getRssHealthSnapshot(input: {
  now?: Date;
  persistedLastSuccessfulFetchAt?: string | null;
  persistedFailure?: boolean;
} = {}) {
  const state = getRuntimeState();
  const now = input.now ?? new Date();
  const staleThresholdMs = readStaleThresholdMs();
  const effectiveLastSuccessfulFetchAt = latestTimestamp(
    state.lastSuccessfulFetchAt,
    input.persistedLastSuccessfulFetchAt ?? null,
  );
  const effectiveLastSuccessMs = Date.parse(effectiveLastSuccessfulFetchAt ?? "");
  const hasSuccessfulFetch = Number.isFinite(effectiveLastSuccessMs);
  const isGloballyStale = !hasSuccessfulFetch || now.getTime() - effectiveLastSuccessMs > staleThresholdMs;
  const feeds = [...state.feeds.values()];
  const staleFeeds = feeds.filter((feed) => {
    if (!feed.last_successful_fetch_at && hasSuccessfulFetch && !isGloballyStale) {
      return false;
    }

    const timestamp = Date.parse(feed.last_successful_fetch_at ?? "");
    return !Number.isFinite(timestamp) || now.getTime() - timestamp > staleThresholdMs;
  });
  const recentFailedFeeds = new Set(
    state.failures
      .filter((failure) => now.getTime() - Date.parse(failure.last_seen_at) <= staleThresholdMs)
      .map((failure) => getFeedKey({ feedHost: failure.feed_host, feedId: failure.feed_id ?? undefined })),
  );
  const criticalFailure =
    state.criticalFailure ||
    Boolean(input.persistedFailure) ||
    !hasSuccessfulFetch ||
    (isGloballyStale && (feeds.length === 0 || staleFeeds.length === feeds.length));
  const status = criticalFailure ? "failed" : staleFeeds.length > 0 || recentFailedFeeds.size > 0 ? "degraded" : "ok";

  return {
    status,
    rssBootOk: state.bootStatus !== "failed",
    bootStatus: state.bootStatus,
    bootStartedAt: state.bootStartedAt,
    bootCompletedAt: state.bootCompletedAt,
    lastSuccessfulFetchAt: effectiveLastSuccessfulFetchAt,
    staleFeedsCount: isGloballyStale && staleFeeds.length === 0 ? 1 : staleFeeds.length,
    failedFeedsCount: recentFailedFeeds.size,
    criticalFailure,
    staleThresholdMs,
    failures: state.failures.slice(0, 10).map((failure) => ({
      failure_type: failure.failure_type,
      phase: failure.phase,
      feed_host: failure.feed_host,
      feed_id: failure.feed_id,
      feed_name: failure.feed_name,
      status_code: failure.status_code,
      retry_count: failure.retry_count,
      timeout_ms: failure.timeout_ms,
      last_seen_at: failure.last_seen_at,
    })),
  };
}

export function captureRssHealthFailureIfNeeded(snapshot: ReturnType<typeof getRssHealthSnapshot>) {
  if (snapshot.status !== "failed") {
    return;
  }

  const state = getRuntimeState();
  const nowMs = Date.now();
  const lastCapturedMs = Date.parse(state.lastHealthFailureCapturedAt ?? "");

  if (Number.isFinite(lastCapturedMs) && nowMs - lastCapturedMs < 15 * 60 * 1000) {
    return;
  }

  state.lastHealthFailureCapturedAt = new Date(nowMs).toISOString();
  captureRssFailure(new Error("RSS health endpoint reports failed feed health."), {
    failureType: "rss_feed_stale",
    phase: "healthcheck",
    level: "error",
    staleThresholdMs: snapshot.staleThresholdMs,
    message: "RSS health endpoint reports failed feed health.",
    extra: {
      lastSuccessfulFetchAt: snapshot.lastSuccessfulFetchAt,
      staleFeedsCount: snapshot.staleFeedsCount,
      failedFeedsCount: snapshot.failedFeedsCount,
      criticalFailure: snapshot.criticalFailure,
    },
  });
}

function normalizeRssContext(context: RssFailureContext & { failureType: RssFailureType; level: RssCaptureLevel }) {
  const feedHost = getUrlHost(context.feedUrl) || "unknown";

  return {
    component: "rss",
    phase: context.phase,
    failureType: context.failureType,
    failure_type: context.failureType,
    feed_host: feedHost,
    feed_url: context.feedUrl ? sanitizeUrl(context.feedUrl) : undefined,
    feed_id: context.feedId,
    feed_name: context.feedName,
    status_code: context.statusCode,
    retry_count: context.retryCount,
    retry_attempt: context.retryAttempt,
    timeout_ms: context.timeoutMs,
    parser: context.parser,
    boot: context.boot,
    stale_threshold_ms: context.staleThresholdMs,
    duration_ms: context.durationMs,
    level: context.level,
    message: context.message,
    environment: readSentryEnvironment(),
    ...context.extra,
  };
}

function levelForFailure(failureType: RssFailureType): RssCaptureLevel {
  if (failureType === "rss_boot_init_failed") {
    return "error";
  }

  if (
    failureType === "rss_retry_exhausted" ||
    failureType === "rss_refresh_job_failed" ||
    failureType === "rss_feed_stale" ||
    failureType.startsWith("rss_parse") ||
    failureType.startsWith("rss_cache")
  ) {
    return "error";
  }

  return "warning";
}

function logRssEvent(level: "info" | "warn" | "error", message: string, context: Record<string, unknown>) {
  logServerEvent(level, message, context);

  if (!isSentryConfigured("server")) {
    return;
  }

  if (level === "error") {
    Sentry.logger.error(message, context);
    return;
  }

  if (level === "warn") {
    Sentry.logger.warn(message, context);
    return;
  }

  Sentry.logger.info(message, context);
}

function isMarkedCaptured(error: unknown) {
  return typeof error === "object" && error !== null && Boolean((error as Record<symbol, unknown>)[CAPTURED_RSS_ERROR]);
}

function markCaptured(error: unknown) {
  if (typeof error === "object" && error !== null) {
    Object.defineProperty(error, CAPTURED_RSS_ERROR, {
      value: true,
      enumerable: false,
    });
  }
}

function latestTimestamp(left: string | null, right: string | null) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return Date.parse(right) > Date.parse(left) ? right : left;
}

function readStaleThresholdMs() {
  const parsed = Number.parseInt(process.env.RSS_STALE_THRESHOLD_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_THRESHOLD_MS;
}

function isValidFeedUrl(feedUrl: string | undefined) {
  if (!feedUrl?.trim()) {
    return false;
  }

  try {
    const parsed = new URL(feedUrl);
    return ["http:", "https:", "newsapi:", "thenewsapi:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
