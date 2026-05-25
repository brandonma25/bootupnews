"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trackMvpMeasurementEvent } from "@/lib/mvp-measurement-client";
import {
  hasSignalReadFiredThisSession,
  subscribeToSignalRead,
} from "@/lib/signal-read-tracking";
import { cn } from "@/lib/utils";

export const COMPREHENSION_PROMPT_STATEMENT =
  "I could explain at least one of today's signals to someone else.";

export const COMPREHENSION_LAST_SHOWN_KEY =
  "bootup:mvp-measurement:comprehension-last-shown";
export const COMPREHENSION_SESSION_COUNT_KEY =
  "bootup:mvp-measurement:session-count";
export const COMPREHENSION_SESSION_COUNTED_KEY =
  "bootup:mvp-measurement:session-counted";

export const COMPREHENSION_DEBUG_QUERY_PARAM = "mvp_survey_debug";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const INACTIVITY_TRIGGER_MS = 45_000;

export type ComprehensionSuppressionReason =
  | "first_session"
  | "no_signal_read"
  | "cap_active"
  | "gate_off";

type Logger = Pick<Console, "info">;

type ComprehensionSelfReportProps = {
  briefingDate?: string | null;
  /** Override the inactivity delay; primarily for tests. */
  inactivityMs?: number;
  /** Override the "now" clock; primarily for tests. */
  now?: () => number;
  /** Inject a logger for tests; defaults to `console`. */
  logger?: Logger;
};

export function ComprehensionSelfReport({
  briefingDate,
  inactivityMs = INACTIVITY_TRIGGER_MS,
  now = Date.now,
  logger,
}: ComprehensionSelfReportProps) {
  const [armed, setArmed] = useState<boolean>(() =>
    typeof window === "undefined" ? false : hasSignalReadFiredThisSession(),
  );
  const [shown, setShown] = useState(false);
  const [hidden, setHidden] = useState(false);

  const inactivityTimerRef = useRef<number | null>(null);
  const triggerInstalledRef = useRef(false);

  const debugMode = readDebugFlag();
  const logSuppression = useCallback(
    (reason: ComprehensionSuppressionReason) => {
      if (!debugMode) {
        return;
      }
      (logger ?? console).info(
        `[comprehension-self-report] suppressed: ${reason}`,
      );
    },
    [debugMode, logger],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sessionCount = incrementSessionCountIfNew();
    const suppressions = collectStaticSuppressions({
      sessionCount,
      nowMs: now(),
      debugMode,
    });

    if (suppressions.length > 0) {
      logSuppression(suppressions[0]!);
      return;
    }

    if (!hasSignalReadFiredThisSession()) {
      logSuppression("no_signal_read");
    }

    return subscribeToSignalRead(() => {
      setArmed(true);
    });
  }, [debugMode, logSuppression, now]);

  const tryShow = useCallback(() => {
    if (shown || hidden) {
      return;
    }
    setShown(true);
  }, [shown, hidden]);

  useEffect(() => {
    if (!armed || shown || hidden || triggerInstalledRef.current) {
      return;
    }

    const sessionCount = readPersistedSessionCount();
    const suppressions = collectStaticSuppressions({
      sessionCount,
      nowMs: now(),
      debugMode,
    });
    if (suppressions.length > 0) {
      return;
    }

    triggerInstalledRef.current = true;

    const clearInactivityTimer = () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };

    const resetInactivity = () => {
      clearInactivityTimer();
      inactivityTimerRef.current = window.setTimeout(tryShow, inactivityMs);
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0) {
        tryShow();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        tryShow();
      }
    };

    resetInactivity();
    window.addEventListener("scroll", resetInactivity, { passive: true });
    window.addEventListener("click", resetInactivity);
    window.addEventListener("keydown", resetInactivity);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInactivityTimer();
      window.removeEventListener("scroll", resetInactivity);
      window.removeEventListener("click", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [armed, shown, hidden, inactivityMs, tryShow, debugMode, now]);

  if (!shown || hidden) {
    return null;
  }

  function handleAnswer(response: "agree" | "disagree") {
    setHidden(true);
    if (typeof window !== "undefined") {
      writeStorage(window.localStorage, COMPREHENSION_LAST_SHOWN_KEY, String(now()));
    }
    void trackMvpMeasurementEvent({
      eventName: "comprehension_self_report",
      route: typeof window !== "undefined" ? window.location.pathname : null,
      surface: "comprehension_self_report",
      briefingDate: briefingDate ?? null,
      metadata: {
        response,
        briefingDate: briefingDate ?? null,
      },
    });
  }

  function handleDismiss() {
    // Dismissal is not an event and does not trip the 7-day cap.
    setHidden(true);
  }

  return (
    <div
      role="dialog"
      aria-label="Comprehension check"
      data-testid="comprehension-self-report"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[var(--bu-container-narrow)] px-3 pb-4",
        "sm:px-4",
      )}
    >
      <div className="rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-default)] bg-[var(--bu-bg-surface)] p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[var(--bu-size-meta)] font-medium leading-snug text-[var(--bu-text-primary)]">
            {COMPREHENSION_PROMPT_STATEMENT}
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss comprehension prompt"
            data-testid="comprehension-self-report-dismiss"
            className="shrink-0 text-[var(--bu-text-tertiary)] transition-colors hover:text-[var(--bu-text-primary)]"
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => handleAnswer("agree")}
            data-testid="comprehension-self-report-agree"
            className="inline-flex items-center justify-center rounded-[var(--bu-radius-md)] border border-[var(--bu-border-default)] bg-[var(--bu-bg-surface)] px-3 py-1.5 text-[var(--bu-size-meta)] font-medium text-[var(--bu-text-primary)] transition-colors hover:border-[var(--bu-accent)] hover:text-[var(--bu-accent)]"
          >
            Agree
          </button>
          <button
            type="button"
            onClick={() => handleAnswer("disagree")}
            data-testid="comprehension-self-report-disagree"
            className="inline-flex items-center justify-center rounded-[var(--bu-radius-md)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] px-3 py-1.5 text-[var(--bu-size-meta)] font-medium text-[var(--bu-text-secondary)] transition-colors hover:border-[var(--bu-border-default)] hover:text-[var(--bu-text-primary)]"
          >
            Disagree
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Suppression checks that are independent of `signal_read` — useful both
 * at mount-time gating and for the debug logger.
 */
export function collectStaticSuppressions({
  sessionCount,
  nowMs,
  debugMode,
}: {
  sessionCount: number;
  nowMs: number;
  debugMode: boolean;
}): ComprehensionSuppressionReason[] {
  const reasons: ComprehensionSuppressionReason[] = [];

  if (sessionCount <= 1 && !debugMode) {
    reasons.push("first_session");
  }

  if (!isOutsideFrequencyCap(nowMs) && !debugMode) {
    reasons.push("cap_active");
  }

  return reasons;
}

function readDebugFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(COMPREHENSION_DEBUG_QUERY_PARAM);
    return value !== null && /^(1|true|yes|on)$/i.test(value.trim());
  } catch {
    return false;
  }
}

function isOutsideFrequencyCap(nowMs: number): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const lastShown = readStorage(window.localStorage, COMPREHENSION_LAST_SHOWN_KEY);
  if (!lastShown) {
    return true;
  }

  const lastShownMs = Number.parseInt(lastShown, 10);
  if (!Number.isFinite(lastShownMs)) {
    return true;
  }

  return nowMs - lastShownMs >= SEVEN_DAYS_MS;
}

function readPersistedSessionCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  try {
    const stored = window.localStorage.getItem(COMPREHENSION_SESSION_COUNT_KEY);
    const parsed = Number.parseInt(stored ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function incrementSessionCountIfNew(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const alreadyCounted = window.sessionStorage.getItem(COMPREHENSION_SESSION_COUNTED_KEY);
    const stored = window.localStorage.getItem(COMPREHENSION_SESSION_COUNT_KEY);
    const previous = Number.parseInt(stored ?? "", 10);
    const safePrevious = Number.isFinite(previous) && previous > 0 ? previous : 0;

    if (alreadyCounted === "1") {
      return safePrevious;
    }

    const next = safePrevious + 1;
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, String(next));
    window.sessionStorage.setItem(COMPREHENSION_SESSION_COUNTED_KEY, "1");
    return next;
  } catch {
    return 0;
  }
}

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Measurement must never block reading.
  }
}
