"use client";

import {
  isMvpMeasurementEventName,
  isUuid,
  type MvpMeasurementEventInput,
  type MvpMeasurementEventName,
} from "@/lib/mvp-measurement";

const VISITOR_STORAGE_KEY = "bootup:mvp-measurement:visitor-id";
const SESSION_STORAGE_KEY = "bootup:mvp-measurement:session-id";

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

export async function trackMvpMeasurementEvent(
  input: Omit<MvpMeasurementEventInput, "visitorId" | "sessionId"> & {
    eventName: MvpMeasurementEventName;
  },
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: MvpMeasurementEventInput = {
    ...input,
    visitorId: getOrCreateMvpVisitorId(),
    sessionId: getOrCreateMvpSessionId(),
  };

  try {
    await fetch("/api/mvp-measurement/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
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
      sourceName: element.dataset.mvpSourceName,
      linkText: element.textContent?.trim().slice(0, 160),
    },
  };
}
