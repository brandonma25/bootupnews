import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HistoryEmptyStateProps = {
  className?: string;
};

export function HistoryEmptyState({ className }: HistoryEmptyStateProps) {
  return (
    <section
      className={cn(
        "mx-auto flex min-h-[52vh] w-full max-w-[var(--bu-container-narrow)] flex-col items-center justify-center text-center",
        className,
      )}
    >
      <h1 className="text-[var(--bu-size-page-title)] font-medium leading-tight text-[var(--bu-text-primary)]">
        Past briefings
      </h1>
      <p className="mt-3 max-w-xl font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-secondary)]">
        Nothing here yet. Bootup News tomorrow morning and this is where past briefings will live.
      </p>
      <div className="mt-5 flex w-full flex-col gap-3 sm:max-w-sm sm:flex-row sm:justify-center">
        <Button asChild variant="secondary" className="min-h-11 w-full sm:w-auto">
          <Link href="/">Back to today</Link>
        </Button>
      </div>
    </section>
  );
}
