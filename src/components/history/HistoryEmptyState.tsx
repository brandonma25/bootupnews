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
        "mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-5 py-12 text-center",
        className,
      )}
    >
      <p className="max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
        Your daily briefing history starts today. Every morning, we surface what matters most —
        organized, sourced, and ready to read. Check back tomorrow for your first archived briefing.
      </p>
      <div className="flex w-full flex-col gap-3 sm:max-w-sm sm:flex-row sm:justify-center">
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </section>
  );
}
