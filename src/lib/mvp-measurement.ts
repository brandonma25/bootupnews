export const MVP_MEASUREMENT_EVENT_NAMES = [
  "homepage_view",
  "signals_page_view",
  "signal_card_expand",
  "signal_full_expansion",
  "signal_full_expansion_proxy",
  "signal_details_click",
  "source_click",
  "category_tab_open",
  "comprehension_prompt_shown",
  "comprehension_prompt_answered",
] as const;

export type MvpMeasurementEventName = (typeof MVP_MEASUREMENT_EVENT_NAMES)[number];

export type MvpMeasurementEventInput = {
  eventName: MvpMeasurementEventName;
  visitorId: string;
  sessionId: string;
  route?: string | null;
  surface?: string | null;
  signalPostId?: string | null;
  signalSlug?: string | null;
  signalRank?: number | null;
  briefingDate?: string | null;
  publishedSlateId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ValidatedMvpMeasurementEvent = Required<
  Pick<MvpMeasurementEventInput, "eventName" | "visitorId" | "sessionId">
> &
  Pick<
    MvpMeasurementEventInput,
    | "route"
    | "surface"
    | "signalPostId"
    | "signalSlug"
    | "signalRank"
    | "briefingDate"
    | "publishedSlateId"
    | "metadata"
  >;

type ValidationResult =
  | {
      ok: true;
      value: ValidatedMvpMeasurementEvent;
    }
  | {
      ok: false;
      error: string;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VISITOR_ID_PATTERN = /^mvp_[a-z0-9_-]{12,80}$/i;
const SESSION_ID_PATTERN = /^mvp_session_[a-z0-9_-]{12,80}$/i;
const MAX_METADATA_KEYS = 24;
const MAX_METADATA_STRING_LENGTH = 300;
const MAX_METADATA_ARRAY_LENGTH = 24;
const SECRET_METADATA_KEY_PATTERN =
  /(authorization|cookie|set-cookie|token|secret|password|passwd|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|dsn|email)/i;
const RICH_COPY_METADATA_KEY_PATTERN =
  /(article[_-]?body|full[_-]?(article|body|copy)|published[_-]?why[_-]?it[_-]?matters|why[_-]?it[_-]?matters|witm|body|content)/i;
const URL_METADATA_KEY_PATTERN = /(url|href|link)$/i;

export function isMvpMeasurementEventName(value: unknown): value is MvpMeasurementEventName {
  return typeof value === "string" && MVP_MEASUREMENT_EVENT_NAMES.includes(value as MvpMeasurementEventName);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function normalizeBriefingDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (DATE_KEY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const isoDatePrefix = trimmed.slice(0, 10);
  return DATE_KEY_PATTERN.test(isoDatePrefix) ? isoDatePrefix : null;
}

function normalizeOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeMetadataValue(key: string, value: unknown, depth = 0): unknown {
  if (SECRET_METADATA_KEY_PATTERN.test(key)) {
    return undefined;
  }

  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    if (RICH_COPY_METADATA_KEY_PATTERN.test(key)) {
      return undefined;
    }

    return sanitizeMetadataString(key, value).slice(0, MAX_METADATA_STRING_LENGTH);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_LENGTH)
      .map((entry) => sanitizeMetadataValue(key, entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  if (typeof value === "object" && depth < 2) {
    if (RICH_COPY_METADATA_KEY_PATTERN.test(key)) {
      return undefined;
    }

    return sanitizeMetadata(value as Record<string, unknown>, depth + 1);
  }

  return undefined;
}

function sanitizeMetadataString(key: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (URL_METADATA_KEY_PATTERN.test(key) || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return sanitizeMetadataUrl(trimmed);
  }

  return trimmed;
}

function sanitizeMetadataUrl(value: string) {
  try {
    const parsed = new URL(value, "https://bootup.local");
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";

    if (parsed.origin === "https://bootup.local") {
      return parsed.pathname;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value.split("?")[0]?.split("#")[0] ?? "";
  }
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .slice(0, MAX_METADATA_KEYS)
      .map(([key, value]) => {
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 64);
        return [sanitizedKey, sanitizeMetadataValue(sanitizedKey, value, depth)];
      })
      .filter(([key, value]) => Boolean(key) && value !== undefined),
  );
}

function sanitizeRoute(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value, "https://bootup.local");
    return parsed.pathname || "/";
  } catch {
    return value.split("?")[0]?.split("#")[0] || null;
  }
}

export function validateMvpMeasurementEvent(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Expected event object." };
  }

  const event = input as Record<string, unknown>;

  if (!isMvpMeasurementEventName(event.eventName)) {
    return { ok: false, error: "Unsupported event name." };
  }

  const visitorId = normalizeOptionalString(event.visitorId, 96);
  if (!visitorId || !VISITOR_ID_PATTERN.test(visitorId)) {
    return { ok: false, error: "Invalid visitor id." };
  }

  const sessionId = normalizeOptionalString(event.sessionId, 104);
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    return { ok: false, error: "Invalid session id." };
  }

  const signalRank =
    typeof event.signalRank === "number" && Number.isInteger(event.signalRank)
      ? event.signalRank
      : typeof event.signalRank === "string" && /^\d+$/.test(event.signalRank)
        ? Number.parseInt(event.signalRank, 10)
        : null;

  if (signalRank !== null && (signalRank < 1 || signalRank > 20)) {
    return { ok: false, error: "Invalid signal rank." };
  }

  const signalPostId = normalizeOptionalString(event.signalPostId, 64);
  if (signalPostId && !isUuid(signalPostId)) {
    return { ok: false, error: "Invalid signal post id." };
  }

  const publishedSlateId = normalizeOptionalString(event.publishedSlateId, 64);
  if (publishedSlateId && !isUuid(publishedSlateId)) {
    return { ok: false, error: "Invalid published slate id." };
  }

  return {
    ok: true,
    value: {
      eventName: event.eventName,
      visitorId,
      sessionId,
      route: sanitizeRoute(normalizeOptionalString(event.route, 120)),
      surface: normalizeOptionalString(event.surface, 120),
      signalPostId,
      signalSlug: normalizeOptionalString(event.signalSlug, 160),
      signalRank,
      briefingDate: normalizeBriefingDate(event.briefingDate),
      publishedSlateId,
      metadata: sanitizeMetadata(event.metadata as Record<string, unknown> | null | undefined),
    },
  };
}
