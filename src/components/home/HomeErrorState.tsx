"use client";

import { RetryButton } from "@/components/shared/RetryButton";

export type HomeErrorStateProps = {
  onRetry: () => void;
  isRetrying: boolean;
};

export function HomeErrorState({ onRetry, isRetrying }: HomeErrorStateProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-card border border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center sm:px-8 lg:max-w-2xl"
    >
      <p className="section-label text-[var(--error)]">
        Briefing unavailable
      </p>
      <h2 className="mt-3 text-xl font-medium text-[var(--foreground)] sm:text-2xl">
        We could not load today&apos;s briefing.
      </h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
        Try again in a moment. The retry action will request fresh page data without forcing a hard reload.
      </p>
      <div className="mt-6 w-full lg:w-auto">
        <RetryButton onRetry={onRetry} isRetrying={isRetrying} />
      </div>
    </div>
  );
}
