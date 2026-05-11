"use client";

import posthog from "posthog-js";
import type { AutocaptureConfig, CaptureResult, CapturedNetworkRequest, Properties } from "posthog-js";

import type { ValidatedMvpMeasurementEvent } from "@/lib/mvp-measurement";

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const MAX_PROPERTY_KEYS = 40;
const MAX_PROPERTY_STRING_LENGTH = 240;
const MAX_PROPERTY_ARRAY_LENGTH = 16;
const MAX_PROPERTY_DEPTH = 2;
const MVP_VISITOR_STORAGE_KEY = "bootup:mvp-measurement:visitor-id";
const MVP_SESSION_STORAGE_KEY = "bootup:mvp-measurement:session-id";

const SECRET_PROPERTY_KEY_PATTERN =
  /(authorization|cookie|set-cookie|token|secret|password|passwd|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|dsn|email)/i;
const RICH_COPY_PROPERTY_KEY_PATTERN =
  /(article[_-]?body|full[_-]?(article|body|copy)|published[_-]?why[_-]?it[_-]?matters|why[_-]?it[_-]?matters|witm|body|content)/i;
const ROUTE_PROPERTY_KEY_PATTERN = /(^route$|path(name)?$)/i;
const URL_PROPERTY_KEY_PATTERN = /(url|href|link)$/i;
const ADMIN_OR_AUTH_ROUTE_PATTERN =
  /^\/(?:admin|dashboard|internal|account|login|signup|auth|reset-password|forgot-password)(?:\/|$)/;
const ADMIN_OR_AUTH_URL_IGNORELIST = [
  /^https?:\/\/[^/]+\/(?:admin|dashboard|internal|account|login|signup|auth|reset-password|forgot-password)(?:[/?#]|$)/i,
  /^\/(?:admin|dashboard|internal|account|login|signup|auth|reset-password|forgot-password)(?:[/?#]|$)/i,
];

let initialized = false;
let routeSyncInstalled = false;
let lastCapturedPageviewRoute = "";

type PostHogClientConfig = {
  enabled: boolean;
  token: string;
  host: string;
  sessionReplayEnabled: boolean;
  pageviewsEnabled: boolean;
  autocaptureEnabled: boolean;
  heatmapsEnabled: boolean;
  deadClicksEnabled: boolean;
  replaySampleRate: number;
};

export function readPostHogClientConfig(): PostHogClientConfig {
  const enabled = readEnabledValue(process.env.NEXT_PUBLIC_ENABLE_POSTHOG);
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim() ?? "";
  const host = normalizePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const sessionReplayEnabled = readEnabledValue(process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY);

  return {
    enabled: enabled && Boolean(token && host),
    token,
    host,
    sessionReplayEnabled,
    pageviewsEnabled: readEnabledValue(process.env.NEXT_PUBLIC_POSTHOG_PAGEVIEWS),
    autocaptureEnabled: readEnabledValue(process.env.NEXT_PUBLIC_POSTHOG_AUTOCAPTURE),
    heatmapsEnabled: readEnabledValue(process.env.NEXT_PUBLIC_POSTHOG_HEATMAPS),
    deadClicksEnabled: readEnabledValue(process.env.NEXT_PUBLIC_POSTHOG_DEAD_CLICKS),
    replaySampleRate: readRatioValue(process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE, 1),
  };
}

export function initializePostHogClient() {
  if (typeof window === "undefined" || initialized) {
    return initialized ? posthog : null;
  }

  const config = readPostHogClientConfig();
  if (!config.enabled) {
    return null;
  }

  try {
    posthog.init(config.token, {
      api_host: config.host,
      autocapture: buildAutocaptureConfig(config.autocaptureEnabled),
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: config.deadClicksEnabled,
      capture_heatmaps: config.heatmapsEnabled,
      disable_session_recording: true,
      enable_heatmaps: config.heatmapsEnabled,
      mask_all_element_attributes: true,
      mask_all_text: true,
      mask_personal_data_properties: true,
      property_denylist: [
        "authorization",
        "email",
        "cookie",
        "set-cookie",
        "password",
        "secret",
        "api_key",
        "apikey",
        "access_token",
        "refresh_token",
      ],
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "body",
        blockSelector: "input, textarea, select, [contenteditable=true], [data-ph-no-capture], .ph-no-capture",
        recordBody: false,
        recordHeaders: false,
        sampleRate: config.replaySampleRate,
        maskCapturedNetworkRequestFn: sanitizeCapturedNetworkRequest,
      },
      before_send(capture) {
        return sanitizePostHogCapture(capture);
      },
      loaded(instance) {
        syncSessionRecordingForRoute(instance, config);
      },
    });

    initialized = true;
    capturePostHogPageview(config);
    installRouteSessionReplaySync(config);
    return posthog;
  } catch {
    return null;
  }
}

export function capturePostHogMvpMeasurementEvent(event: ValidatedMvpMeasurementEvent) {
  try {
    const config = readPostHogClientConfig();
    if (!config.enabled || typeof window === "undefined") {
      return;
    }

    initializePostHogClient();
    const properties = buildPostHogMvpProperties(event);
    if (!isPostHogCaptureEligible(properties)) {
      return;
    }

    void sendPostHogBrowserCapture(config, event.eventName, properties);
  } catch {
    // Product analytics is best effort and must never affect reading or navigation.
  }
}

export function isPostHogSessionReplayEligible(pathname: string | null | undefined) {
  const normalizedPath = sanitizeRoutePath(pathname || "/") || "/";
  return !ADMIN_OR_AUTH_ROUTE_PATTERN.test(normalizedPath);
}

export function sanitizePostHogProperties(
  properties: Record<string, unknown> | null | undefined,
  depth = 0,
): Properties {
  if (!properties || typeof properties !== "object" || Array.isArray(properties) || depth > MAX_PROPERTY_DEPTH) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties)
      .slice(0, MAX_PROPERTY_KEYS)
      .map(([key, value]) => {
        const safeKey = sanitizePropertyKey(key);
        return [safeKey, sanitizePostHogValue(safeKey, value, depth)];
      })
      .filter(([key, value]) => Boolean(key) && value !== undefined),
  ) as Properties;
}

function buildPostHogMvpProperties(event: ValidatedMvpMeasurementEvent): Properties {
  return sanitizePostHogProperties({
    route: event.route,
    surface: event.surface,
    signalPostId: event.signalPostId,
    signalSlug: event.signalSlug,
    signalRank: event.signalRank,
    briefingDate: event.briefingDate,
    publishedSlateId: event.publishedSlateId,
    mvpVisitorId: event.visitorId,
    mvpSessionId: event.sessionId,
    ...(event.metadata ?? {}),
  });
}

async function sendPostHogBrowserCapture(
  config: Pick<PostHogClientConfig, "host" | "token">,
  eventName: ValidatedMvpMeasurementEvent["eventName"] | "$pageview",
  properties: Properties,
) {
  try {
    const endpoint = `${config.host}/capture/`;
    await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        api_key: config.token,
        event: eventName,
        properties: {
          ...properties,
          distinct_id: properties.mvpVisitorId,
          $session_id: properties.mvpSessionId,
        },
      }),
    });
  } catch {
    // Direct PostHog capture is best effort and must never block reading.
  }
}

function sanitizePostHogCapture(capture: CaptureResult | null) {
  if (!capture) {
    return null;
  }

  if (!isPostHogCaptureEligible(capture.properties)) {
    return null;
  }

  const sdkProjectToken = capture.properties?.token;
  capture.properties = sanitizePostHogProperties(capture.properties);
  if (typeof sdkProjectToken === "string" && sdkProjectToken.trim()) {
    capture.properties.token = sdkProjectToken;
  }

  return capture;
}

function sanitizePostHogValue(key: string, value: unknown, depth: number): unknown {
  if (SECRET_PROPERTY_KEY_PATTERN.test(key)) {
    return undefined;
  }

  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    if (RICH_COPY_PROPERTY_KEY_PATTERN.test(key)) {
      return undefined;
    }

    return sanitizeStringProperty(key, value);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_PROPERTY_ARRAY_LENGTH)
      .map((entry) => sanitizePostHogValue(key, entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  if (typeof value === "object" && depth < MAX_PROPERTY_DEPTH) {
    if (RICH_COPY_PROPERTY_KEY_PATTERN.test(key)) {
      return undefined;
    }

    return sanitizePostHogProperties(value as Record<string, unknown>, depth + 1);
  }

  return undefined;
}

function sanitizeStringProperty(key: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const sanitized = ROUTE_PROPERTY_KEY_PATTERN.test(key)
    ? sanitizeRoutePath(trimmed)
    : URL_PROPERTY_KEY_PATTERN.test(key) || isUrlLike(trimmed)
    ? sanitizeUrl(trimmed)
    : trimmed;

  return sanitized.slice(0, MAX_PROPERTY_STRING_LENGTH);
}

function sanitizePropertyKey(key: string) {
  return key.replace(/[^a-zA-Z0-9_$.-]/g, "_").slice(0, 64);
}

function readEnabledValue(value: string | undefined) {
  return ENABLED_VALUES.has(value?.trim().toLowerCase() ?? "");
}

function readRatioValue(value: string | undefined, fallback: number) {
  const rawValue = value?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(parsed, 1));
}

function buildAutocaptureConfig(enabled: boolean): false | AutocaptureConfig {
  if (!enabled) {
    return false;
  }

  return {
    capture_copied_text: false,
    dom_event_allowlist: ["click"],
    element_allowlist: ["a", "button"],
    element_attribute_ignorelist: [
      "href",
      "src",
      "value",
      "title",
      "aria-label",
      "data-testid",
      "data-mvp-signal-slug",
      "data-mvp-source-name",
    ],
    url_ignorelist: ADMIN_OR_AUTH_URL_IGNORELIST,
  };
}

function normalizePostHogHost(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function sanitizeRoutePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed, "https://bootup.local");
    return parsed.pathname || "/";
  } catch {
    return trimmed.split("?")[0]?.split("#")[0] || "";
  }
}

function sanitizeUrl(value: string) {
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

function isUrlLike(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function sanitizeCapturedNetworkRequest(data: CapturedNetworkRequest) {
  try {
    const sanitized = {
      ...data,
      name: typeof data.name === "string" ? sanitizeUrl(data.name) : data.name,
      requestBody: null,
      requestHeaders: undefined,
      responseBody: null,
      responseHeaders: undefined,
    };

    return sanitized;
  } catch {
    return undefined;
  }
}

function isPostHogCaptureEligible(properties: Properties | undefined) {
  if (typeof window !== "undefined" && !isPostHogSessionReplayEligible(window.location.pathname)) {
    return false;
  }

  const route = readCaptureRoute(properties);
  return route ? isPostHogSessionReplayEligible(route) : true;
}

function readCaptureRoute(properties: Properties | undefined) {
  if (!properties) {
    return "";
  }

  for (const key of ["$pathname", "pathname", "path", "route", "$current_url", "currentUrl"]) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) {
      return sanitizeRoutePath(value);
    }
  }

  return "";
}

function installRouteSessionReplaySync(config: PostHogClientConfig) {
  if (routeSyncInstalled || typeof window === "undefined") {
    return;
  }

  routeSyncInstalled = true;
  const sync = () => {
    syncSessionRecordingForRoute(posthog, config);
    capturePostHogPageview(config);
  };
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushState(...args) {
    const result = originalPushState.apply(this, args);
    sync();
    return result;
  };

  window.history.replaceState = function replaceState(...args) {
    const result = originalReplaceState.apply(this, args);
    sync();
    return result;
  };

  window.addEventListener("popstate", sync);
}

function capturePostHogPageview(config: Pick<PostHogClientConfig, "host" | "pageviewsEnabled" | "token">) {
  if (!config.pageviewsEnabled || typeof window === "undefined") {
    return;
  }

  try {
    const route = sanitizeRoutePath(window.location.href) || "/";
    if (!isPostHogSessionReplayEligible(route) || route === lastCapturedPageviewRoute) {
      return;
    }

    lastCapturedPageviewRoute = route;
    void sendPostHogBrowserCapture(
      config,
      "$pageview",
      sanitizePostHogProperties({
        $current_url: window.location.href,
        $pathname: window.location.pathname,
        route,
        mvpVisitorId: getOrCreatePostHogStorageId(window.localStorage, MVP_VISITOR_STORAGE_KEY, "mvp"),
        mvpSessionId: getOrCreatePostHogStorageId(window.sessionStorage, MVP_SESSION_STORAGE_KEY, "mvp_session"),
      }),
    );
  } catch {
    // PostHog pageview capture is best effort and must never affect routing.
  }
}

function getOrCreatePostHogStorageId(storage: Storage, key: string, prefix: string) {
  try {
    const existing = storage.getItem(key);
    if (existing?.startsWith(`${prefix}_`)) {
      return existing;
    }

    const value = createPostHogStorageId(prefix);
    storage.setItem(key, value);
    return value;
  } catch {
    return createPostHogStorageId(prefix);
  }
}

function createPostHogStorageId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function syncSessionRecordingForRoute(
  client: Pick<typeof posthog, "startSessionRecording" | "stopSessionRecording">,
  config: Pick<PostHogClientConfig, "sessionReplayEnabled" | "replaySampleRate">,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (config.sessionReplayEnabled && isPostHogSessionReplayEligible(window.location.pathname)) {
      client.startSessionRecording(config.replaySampleRate >= 1 ? true : undefined);
    } else {
      client.stopSessionRecording();
    }
  } catch {
    // Session replay controls are non-critical; analytics must fail closed.
  }
}
