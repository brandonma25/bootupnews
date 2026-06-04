"use client";

import {
  isMvpMeasurementEventName,
  isUuid,
  resolveMvpCohortFromMarkers,
  validateMvpMeasurementEvent,
  type MvpCohort,
  type MvpMeasurementEventInput,
  type MvpMeasurementEventName,
} from "@/lib/mvp-measurement";
import { capturePostHogMvpMeasurementEvent } from "@/lib/posthog-client";

const VISITOR_STORAGE_KEY = "bootup:mvp-measurement:visitor-id";
const SESSION_STORAGE_KEY = "bootup:mvp-measurement:session-id";
const COHORT_STORAGE_KEY = "bootup:mvp-measurement:cohort";
const QA_FLAG_QUERY_PARAM = "mvp_qa";
const COHORT_QUERY_PARAM = "c";

function createId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function readStorage(storage: Storage | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Measurement must never block reading. If storage is unavailable, the
    // caller still receives an ephemeral identifier for this event.
  }
}

export function getOrCreateMvpVisitorId() {
  const existing = readStorage(
    typeof window !== "undefined" ? window.localStorage : undefined,
    VISITOR_STORAGE_KEY,
  );

  if (existing?.startsWith("mvp_")) {
    return existing;
  }

  const visitorId = createId("mvp");
  writeStorage(
    typeof window !== "undefined" ? window.localStorage : undefined,
    VISITOR_STORAGE_KEY,
    visitorId,
  );
  return visitorId;
}

export function getOrCreateMvpSessionId() {
  const existing = readStorage(
    typeof window !== "undefined" ? window.sessionStorage : undefined,
    SESSION_STORAGE_KEY,
  );

  if (existing?.startsWith("mvp_session_")) {
    return existing;
  }

  const sessionId = createId("mvp_session");
  writeStorage(
    typeof window !== "undefined" ? window.sessionStorage : undefined,
    SESSION_STORAGE_KEY,
    sessionId,
  );
  return sessionId;
}

export function getSignalPostIdFromLegacyId(value: string | null | undefined) {
  return isUuid(value) ? value : null;
}

function readQueryParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function isTruthyQueryValue(value: string | null): boolean {
  if (value === null) {
    return false;
  }
  return /^(1|true|yes|on)$/i.test(value.trim());
}

/**
 * Resolve cohort from URL entry markers (`?mvp_qa=1`, `?c=tester`,
 * `?c=internal`), falling back to a previously persisted value, then to
 * `"internal"`. Whenever the URL provides a marker, the resolved cohort
 * is persisted client-side so subsequent visits without a marker keep the
 * same tag (matches how visitor_id is persisted).
 */
export function resolveAndPersistMvpCohort(): MvpCohort {
  if (typeof window === "undefined") {
    return "internal";
  }

  const queryQa = isTruthyQueryValue(readQueryParam(QA_FLAG_QUERY_PARAM));
  const queryCohort = readQueryParam(COHORT_QUERY_PARAM);
  const persisted = readStorage(window.localStorage, COHORT_STORAGE_KEY);

  const resolved = resolveMvpCohortFromMarkers({
    queryQa,
    queryCohort,
    persisted,
  });

  const hadQueryMarker = queryQa || Boolean(queryCohort);
  if (hadQueryMarker || persisted !== resolved) {
    writeStorage(window.localStorage, COHORT_STORAGE_KEY, resolved);
  }

  return resolved;
}

export async function trackMvpMeasurementEvent(
  input: Omit<MvpMeasurementEventInput, "visitorId" | "sessionId"> & {
    eventName: MvpMeasurementEventName;
  },
) {
  if (typeof window === "undefined") {
    return;
  }

  const visitorId = getOrCreateMvpVisitorId();
  const cohort = resolveAndPersistMvpCohort();
  const payload: MvpMeasurementEventInput = {
    ...input,
    visitorId,
    sessionId: getOrCreateMvpSessionId(),
    metadata: {
      ...(input.metadata ?? {}),
      cohort,
    },
  };
  const validation = validateMvpMeasurementEvent(payload);
  const requestPayload = validation.ok ? validation.value : payload;

  if (validation.ok) {
    capturePostHogMvpMeasurementEvent(validation.value);
  }

  try {
    await fetch("/api/mvp-measurement/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(requestPayload),
      keepalive: true,
    });
  } catch {
    // Best-effort instrumentation only. Measurement failures must not affect
    // public reading, ranking, visibility, or navigation.
  }
}

export function readMvpMeasurementDataset(element: HTMLElement) {
  const eventName = element.dataset.mvpMeasurementEvent;
  if (!isMvpMeasurementEventName(eventName)) {
    return null;
  }

  const signalRank = element.dataset.mvpSignalRank
    ? Number.parseInt(element.dataset.mvpSignalRank, 10)
    : null;

  return {
    eventName,
    route: element.dataset.mvpRoute ?? null,
    surface: element.dataset.mvpSurface ?? null,
    signalPostId: getSignalPostIdFromLegacyId(element.dataset.mvpSignalPostId),
    signalSlug: element.dataset.mvpSignalSlug ?? null,
    signalRank: Number.isFinite(signalRank) ? signalRank : null,
    briefingDate: element.dataset.mvpBriefingDate ?? null,
    publishedSlateId: element.dataset.mvpPublishedSlateId ?? null,
    metadata: {
      categoryKey: element.dataset.mvpCategory,
      sourceName: element.dataset.mvpSourceName,
      linkText: element.textContent?.trim().slice(0, 160),
    },
  };
}
