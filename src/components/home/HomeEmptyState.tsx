import { cn } from "@/lib/utils";

export type HomeEmptyStateProps = {
  message: string;
  expectedGenerationTime: string;
  className?: string;
};

export function HomeEmptyState({
  message,
  expectedGenerationTime,
  className,
}: HomeEmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-[28px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-8 text-center shadow-[0_16px_50px_rgba(17,24,39,0.05)] sm:px-8 lg:max-w-2xl",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Briefing pending
      </p>
      <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
        {message}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
        Expected generation time: <span className="font-semibold text-[var(--foreground)]">{expectedGenerationTime}</span>
      </p>
    </div>
  );
}
