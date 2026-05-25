"use client";

import { trackMvpMeasurementEvent } from "@/lib/mvp-measurement-client";

export type SignalReadTracking = {
  route?: string | null;
  surface?: string | null;
  signalPostId: string;
  signalSlug?: string | null;
  signalRank?: number | null;
  briefingDate?: string | null;
  publishedSlateId?: string | null;
};

export const SIGNAL_READ_DWELL_MS = 20_000;
export const SIGNAL_READ_VISIBILITY_THRESHOLD = 0.5;
const SIGNAL_READ_CARD_SESSION_PREFIX = "bootup:mvp-measurement:signal-read:";
const SIGNAL_READ_SESSION_FIRED_KEY = "bootup:mvp-measurement:signal-read-fired";

type CardState = {
  tracking: SignalReadTracking;
  observer: IntersectionObserver;
  visible: boolean;
  visibleSinceMs: number | null;
  dwellTimer: number | null;
  dwellMet: boolean;
  scrolledWhileVisible: boolean;
  fired: boolean;
};

const cardStates = new Map<string, CardState>();
const signalReadListeners = new Set<() => void>();
let scrollHandlerInstalled = false;
let nowFn: () => number = () => Date.now();

/** Test hook: override the dwell clock. */
export function __setSignalReadClock(clock: () => number) {
  nowFn = clock;
}

/** Test hook: reset module state (observers + listeners + clock). */
export function __resetSignalReadStateForTests() {
  for (const state of cardStates.values()) {
    state.observer.disconnect();
    if (state.dwellTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(state.dwellTimer);
    }
  }
  cardStates.clear();
  signalReadListeners.clear();
  if (scrollHandlerInstalled && typeof window !== "undefined") {
    window.removeEventListener("scroll", handleScroll);
  }
  scrollHandlerInstalled = false;
  nowFn = () => Date.now();
}

export function subscribeToSignalRead(listener: () => void): () => void {
  signalReadListeners.add(listener);
  return () => {
    signalReadListeners.delete(listener);
  };
}

export function hasSignalReadFiredThisSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(SIGNAL_READ_SESSION_FIRED_KEY) === "1";
  } catch {
    return false;
  }
}

function markSessionSignalReadFired() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(SIGNAL_READ_SESSION_FIRED_KEY, "1");
  } catch {
    // Measurement must never block reading.
  }
}

function markCardFiredInSession(signalPostId: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      `${SIGNAL_READ_CARD_SESSION_PREFIX}${signalPostId}`,
      "1",
    );
  } catch {
    // Measurement must never block reading.
  }
}

function hasCardFiredInSession(signalPostId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return (
      window.sessionStorage.getItem(
        `${SIGNAL_READ_CARD_SESSION_PREFIX}${signalPostId}`,
      ) === "1"
    );
  } catch {
    return false;
  }
}

function installScrollHandler() {
  if (scrollHandlerInstalled || typeof window === "undefined") {
    return;
  }
  scrollHandlerInstalled = true;
  window.addEventListener("scroll", handleScroll, { passive: true });
}

function handleScroll() {
  for (const state of cardStates.values()) {
    if (!state.fired && state.visible) {
      state.scrolledWhileVisible = true;
      if (state.dwellMet) {
        emitSignalRead(state);
      }
    }
  }
}

function emitSignalRead(state: CardState) {
  if (state.fired) {
    return;
  }
  state.fired = true;
  const dwellMs =
    state.visibleSinceMs !== null ? nowFn() - state.visibleSinceMs : SIGNAL_READ_DWELL_MS;
  markCardFiredInSession(state.tracking.signalPostId);
  const wasFirst = !hasSignalReadFiredThisSession();
  markSessionSignalReadFired();

  void trackMvpMeasurementEvent({
    eventName: "signal_read",
    route: state.tracking.route ?? null,
    surface: state.tracking.surface ?? null,
    signalPostId: state.tracking.signalPostId,
    signalSlug: state.tracking.signalSlug ?? null,
    signalRank: state.tracking.signalRank ?? null,
    briefingDate: state.tracking.briefingDate ?? null,
    publishedSlateId: state.tracking.publishedSlateId ?? null,
    metadata: {
      signalRank: state.tracking.signalRank ?? null,
      dwellMs,
    },
  });

  state.observer.disconnect();
  if (state.dwellTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(state.dwellTimer);
  }
  cardStates.delete(state.tracking.signalPostId);

  if (wasFirst) {
    for (const listener of signalReadListeners) {
      try {
        listener();
      } catch {
        // Listeners must never break measurement.
      }
    }
  }
}

/**
 * Attach the dwell-based observer to a single signal card. Emits
 * `signal_read` once per signal per session when (a) the card is ≥50% in
 * viewport for ≥20s continuous AND (b) at least one scroll event has
 * occurred while it was visible. Caller is expected to call the returned
 * cleanup on unmount.
 */
export function registerSignalReadObserver(
  element: Element,
  tracking: SignalReadTracking,
): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  if (hasCardFiredInSession(tracking.signalPostId)) {
    return () => {};
  }

  const existing = cardStates.get(tracking.signalPostId);
  if (existing) {
    existing.observer.disconnect();
    if (existing.dwellTimer !== null) {
      window.clearTimeout(existing.dwellTimer);
    }
    cardStates.delete(tracking.signalPostId);
  }

  installScrollHandler();

  const state: CardState = {
    tracking,
    observer: null as unknown as IntersectionObserver,
    visible: false,
    visibleSinceMs: null,
    dwellTimer: null,
    dwellMet: false,
    scrolledWhileVisible: false,
    fired: false,
  };

  state.observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const meetsThreshold =
          entry.isIntersecting && entry.intersectionRatio >= SIGNAL_READ_VISIBILITY_THRESHOLD;

        if (meetsThreshold && !state.visible) {
          state.visible = true;
          state.visibleSinceMs = nowFn();
          state.dwellMet = false;
          if (state.dwellTimer !== null) {
            window.clearTimeout(state.dwellTimer);
          }
          state.dwellTimer = window.setTimeout(() => {
            if (state.fired) {
              return;
            }
            state.dwellMet = true;
            if (state.scrolledWhileVisible) {
              emitSignalRead(state);
            }
          }, SIGNAL_READ_DWELL_MS);
        } else if (!meetsThreshold && state.visible) {
          state.visible = false;
          state.visibleSinceMs = null;
          state.dwellMet = false;
          if (state.dwellTimer !== null) {
            window.clearTimeout(state.dwellTimer);
            state.dwellTimer = null;
          }
        }
      }
    },
    { threshold: [SIGNAL_READ_VISIBILITY_THRESHOLD] },
  );

  state.observer.observe(element);
  cardStates.set(tracking.signalPostId, state);

  return () => {
    state.observer.disconnect();
    if (state.dwellTimer !== null) {
      window.clearTimeout(state.dwellTimer);
    }
    cardStates.delete(tracking.signalPostId);
  };
}
