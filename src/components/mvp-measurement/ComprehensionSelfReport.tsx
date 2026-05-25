"use client";

import { useEffect, useState } from "react";

import { trackMvpMeasurementEvent } from "@/lib/mvp-measurement-client";
import { cn } from "@/lib/utils";

export const COMPREHENSION_PROMPT_STATEMENT =
  "I could explain at least one of today's signals to someone else.";

export const COMPREHENSION_LAST_SHOWN_KEY =
  "bootup:mvp-measurement:comprehension-last-shown";
export const COMPREHENSION_SESSION_COUNT_KEY =
  "bootup:mvp-measurement:session-count";
export const COMPREHENSION_SESSION_COUNTED_KEY =
  "bootup:mvp-measurement:session-counted";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_DELAY_MS = 30_000;

type ComprehensionSelfReportProps = {
  briefingDate?: string | null;
  /** Override the visibility delay; primarily for tests. */
  delayMs?: number;
  /** Override the "now" clock; primarily for tests. */
  now?: () => number;
};

export function ComprehensionSelfReport({
  briefingDate,
  delayMs = DEFAULT_DELAY_MS,
  now = Date.now,
}: ComprehensionSelfReportProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sessionCount = incrementSessionCountIfNew();
    if (sessionCount <= 1) {
      return;
    }

    if (!isOutsideFrequencyCap(now())) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isOutsideFrequencyCap(now())) {
        return;
      }

      writeStorage(window.localStorage, COMPREHENSION_LAST_SHOWN_KEY, String(now()));
      setShouldRender(true);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, now]);

  if (!shouldRender || hidden) {
    return null;
  }

  function handleAnswer(response: "agree" | "disagree") {
    setHidden(true);
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
    // Dismissal is not an event by design (see PR description).
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
