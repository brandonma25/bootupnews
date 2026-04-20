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
      className="mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-[28px] border border-[rgba(154,52,18,0.18)] bg-[rgba(255,255,255,0.72)] px-5 py-8 text-center shadow-[0_16px_50px_rgba(17,24,39,0.05)] sm:px-8 lg:max-w-2xl"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
        Briefing unavailable
      </p>
      <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
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
