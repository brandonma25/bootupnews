"use client";

import { RetryButton } from "@/components/shared/RetryButton";
import { cn } from "@/lib/utils";

type HistoryErrorStateProps = {
  onRetry: () => void;
  isRetrying: boolean;
  className?: string;
};

export function HistoryErrorState({ onRetry, isRetrying, className }: HistoryErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-card border border-[var(--line)] bg-[var(--card)] p-6 text-center",
        className,
      )}
    >
      <div className="space-y-2">
        <h2 className="text-base font-medium text-[var(--foreground)]">
          Briefing history unavailable
        </h2>
        <p className="text-sm leading-6 text-[var(--muted)]">
          We could not load your previous briefings.
        </p>
      </div>
      <RetryButton onRetry={onRetry} isRetrying={isRetrying} />
    </section>
  );
}
