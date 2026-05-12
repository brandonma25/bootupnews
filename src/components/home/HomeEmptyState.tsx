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
        "mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-card border border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center sm:px-8 lg:max-w-2xl",
        className,
      )}
    >
      <p className="section-label">
        Briefing pending
      </p>
      <h2 className="mt-3 text-xl font-medium text-[var(--foreground)] sm:text-2xl">
        {message}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
        Expected generation time: <span className="font-medium text-[var(--foreground)]">{expectedGenerationTime}</span>
      </p>
    </div>
  );
}
