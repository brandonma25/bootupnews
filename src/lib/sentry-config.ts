const DEFAULT_TRACES_SAMPLE_RATE = 0.05;
const DEFAULT_REPLAYS_SESSION_SAMPLE_RATE = 0;
const DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE = 0.05;

const SECRET_FIELD_PATTERN =
  /(authorization|cookie|set-cookie|token|secret|password|passwd|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|session|signature|sig|code)/i;

type MutableSentryEvent = {
  request?: {
    url?: string;
    headers?: Record<string, unknown>;
    cookies?: unknown;
    query_string?: unknown;
  };
  contexts?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
  breadcrumbs?: Array<{
    data?: Record<string, unknown>;
  }>;
  user?: unknown;
};

type MutableBreadcrumb = {
  data?: Record<string, unknown>;
};

export function readSentryDsn(runtime: "server" | "client" = "server") {
  if (runtime === "client") {
    return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
  }

  return process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
}

export function isSentryConfigured(runtime: "server" | "client" = "server") {
  return Boolean(readSentryDsn(runtime));
}

export function readSentryEnvironment() {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function readSentryRelease() {
  return (
    process.env.SENTRY_RELEASE?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    undefined
  );
}

export function readSampleRate(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseFloat(rawValue);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(parsed, 1));
}

export function readSentryTracesSampleRate() {
  return readSampleRate("SENTRY_TRACES_SAMPLE_RATE", DEFAULT_TRACES_SAMPLE_RATE);
}

export function readSentryReplaysSessionSampleRate() {
  return readSampleRate("SENTRY_REPLAYS_SESSION_SAMPLE_RATE", DEFAULT_REPLAYS_SESSION_SAMPLE_RATE);
}

export function readSentryReplaysOnErrorSampleRate() {
  return readSampleRate("SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE", DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE);
}

export function sanitizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";

    if (parsed.origin === "null") {
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return trimmed.split("?")[0]?.split("#")[0] ?? "";
  }
}

export function getUrlHost(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    const withoutQuery = value.split("?")[0] ?? value;
    const match = withoutQuery.match(/^[a-z]+:\/\/([^/]+)/i);
    return match?.[1]?.replace(/^www\./, "").toLowerCase() ?? "";
  }
}

function sanitizeRecord(input: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 4) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (SECRET_FIELD_PATTERN.test(key)) {
        return [key, "[Filtered]"];
      }

      if (typeof value === "string") {
        return [key, sanitizeMaybeUrl(value)];
      }

      if (Array.isArray(value)) {
        return [
          key,
          value.slice(0, 20).map((entry) =>
            typeof entry === "string"
              ? sanitizeMaybeUrl(entry)
              : isRecord(entry)
                ? sanitizeRecord(entry, depth + 1)
                : entry,
          ),
        ];
      }

      if (isRecord(value)) {
        return [key, sanitizeRecord(value, depth + 1)];
      }

      return [key, value];
    }),
  );
}

function sanitizeMaybeUrl(value: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return sanitizeUrl(value);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * PRD-65 Phase 4.5 — drop "Feed request retry exhausted" events from Sentry.
 * These now flow into the Notion Source Health Log instead. Other RssError
 * variants continue to report normally (only this single post-retry-exhaustion
 * message pattern is filtered).
 *
 * Exported for unit testing.
 */
const RSS_RETRY_EXHAUSTED_PATTERN = /^Feed request retry exhausted for /;

export function isFilteredRssNoiseEvent(event: unknown): boolean {
  if (!isRecord(event)) return false;

  const exception = (event as { exception?: unknown }).exception;
  if (isRecord(exception)) {
    const values = (exception as { values?: unknown }).values;
    if (Array.isArray(values)) {
      for (const v of values) {
        if (isRecord(v)) {
          const value = (v as { value?: unknown }).value;
          if (typeof value === "string" && RSS_RETRY_EXHAUSTED_PATTERN.test(value)) {
            return true;
          }
        }
      }
    }
  }

  const message = (event as { message?: unknown }).message;
  if (typeof message === "string" && RSS_RETRY_EXHAUSTED_PATTERN.test(message)) {
    return true;
  }

  return false;
}

export function sanitizeSentryEvent<T>(event: T): T {
  if (!isRecord(event)) {
    return event;
  }

  const mutableEvent = event as MutableSentryEvent;

  if (mutableEvent.request) {
    if (mutableEvent.request.url) {
      mutableEvent.request.url = sanitizeUrl(mutableEvent.request.url);
    }

    if (mutableEvent.request.headers) {
      mutableEvent.request.headers = sanitizeRecord(mutableEvent.request.headers);
    }

    delete mutableEvent.request.cookies;
    delete mutableEvent.request.query_string;
  }

  if (mutableEvent.contexts) {
    mutableEvent.contexts = sanitizeRecord(mutableEvent.contexts);
  }

  if (mutableEvent.extra) {
    mutableEvent.extra = sanitizeRecord(mutableEvent.extra);
  }

  if (mutableEvent.breadcrumbs) {
    mutableEvent.breadcrumbs = mutableEvent.breadcrumbs.map((breadcrumb) => sanitizeBreadcrumb(breadcrumb));
  }

  delete mutableEvent.user;

  return event;
}

export function sanitizeBreadcrumb<T>(breadcrumb: T): T {
  if (!isRecord(breadcrumb)) {
    return breadcrumb;
  }

  const mutableBreadcrumb = breadcrumb as MutableBreadcrumb;

  if (mutableBreadcrumb.data) {
    mutableBreadcrumb.data = sanitizeRecord(mutableBreadcrumb.data);
  }

  return breadcrumb;
}
