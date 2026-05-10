"use client";

import posthog from "posthog-js";
import type { CaptureResult, Properties } from "posthog-js";

import type { ValidatedMvpMeasurementEvent } from "@/lib/mvp-measurement";

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const MAX_PROPERTY_KEYS = 40;
const MAX_PROPERTY_STRING_LENGTH = 240;
const MAX_PROPERTY_ARRAY_LENGTH = 16;
const MAX_PROPERTY_DEPTH = 2;

const SECRET_PROPERTY_KEY_PATTERN =
  /(authorization|cookie|set-cookie|token|secret|password|passwd|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|dsn|email)/i;
const RICH_COPY_PROPERTY_KEY_PATTERN =
  /(article[_-]?body|full[_-]?(article|body|copy)|published[_-]?why[_-]?it[_-]?matters|why[_-]?it[_-]?matters|witm|body|content)/i;
const ROUTE_PROPERTY_KEY_PATTERN = /(^route$|path(name)?$)/i;
const URL_PROPERTY_KEY_PATTERN = /(url|href|link)$/i;
const ADMIN_OR_AUTH_ROUTE_PATTERN =
  /^\/(?:admin|dashboard|internal|account|login|signup|auth|reset-password|forgot-password)(?:\/|$)/;

let initialized = false;
let routeSyncInstalled = false;

type PostHogClientConfig = {
  enabled: boolean;
  token: string;
  host: string;
  sessionReplayEnabled: boolean;
};

export function readPostHogClientConfig(): PostHogClientConfig {
  const enabled = ENABLED_VALUES.has(
    process.env.NEXT_PUBLIC_ENABLE_POSTHOG?.trim().toLowerCase() ?? "",
  );
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim() ?? "";
  const host = normalizePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const sessionReplayEnabled = ENABLED_VALUES.has(
    process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY?.trim().toLowerCase() ?? "",
  );

  return {
    enabled: enabled && Boolean(token && host),
    token,
    host,
    sessionReplayEnabled,
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
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      mask_all_element_attributes: true,
      mask_all_text: true,
      mask_personal_data_properties: true,
      property_denylist: [
        "$current_url",
        "$host",
        "$pathname",
        "$referrer",
        "$referring_domain",
        "email",
        "cookie",
      ],
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "body",
        blockSelector: "input, textarea, select, [contenteditable=true], [data-ph-no-capture], .ph-no-capture",
        recordBody: false,
        recordHeaders: false,
      },
      before_send(capture) {
        return sanitizePostHogCapture(capture);
      },
      loaded(instance) {
        syncSessionRecordingForRoute(instance, config.sessionReplayEnabled);
      },
    });

    initialized = true;
    installRouteSessionReplaySync(config.sessionReplayEnabled);
    return posthog;
  } catch {
    return null;
  }
}

export function capturePostHogMvpMeasurementEvent(event: ValidatedMvpMeasurementEvent) {
  try {
    const client = initializePostHogClient();
    if (!client) {
      return;
    }

    client.capture(event.eventName, buildPostHogMvpProperties(event));
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

function sanitizePostHogCapture(capture: CaptureResult | null) {
  if (!capture) {
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
  return key.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 64);
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

function installRouteSessionReplaySync(sessionReplayEnabled: boolean) {
  if (routeSyncInstalled || typeof window === "undefined") {
    return;
  }

  routeSyncInstalled = true;
  const sync = () => syncSessionRecordingForRoute(posthog, sessionReplayEnabled);
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

function syncSessionRecordingForRoute(
  client: Pick<typeof posthog, "startSessionRecording" | "stopSessionRecording">,
  sessionReplayEnabled: boolean,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (sessionReplayEnabled && isPostHogSessionReplayEligible(window.location.pathname)) {
      client.startSessionRecording({ sampling: true });
    } else {
      client.stopSessionRecording();
    }
  } catch {
    // Session replay controls are non-critical; analytics must fail closed.
  }
}
