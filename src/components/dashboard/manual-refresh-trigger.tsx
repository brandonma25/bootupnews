"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";

import { generateBriefingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { ReadingWindowMetrics } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ManualRefreshTrigger({
  readingWindow,
  readingMetrics,
  isAiConfigured,
}: {
  readingWindow: string;
  readingMetrics?: ReadingWindowMetrics;
  isAiConfigured: boolean;
}) {
  return (
    <div className="flex flex-col items-stretch gap-2 min-w-[168px]">
      <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
          Reading window
        </p>
        <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
          {readingWindow}
        </p>
        {readingMetrics ? (
          <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
            {readingMetrics.progressLabel}
          </p>
        ) : null}
      </div>
      {isAiConfigured ? (
        <form action={generateBriefingAction}>
          <RefreshBriefingButton />
        </form>
      ) : (
        <Link href="/settings">
          <Button variant="secondary" className="w-full gap-2 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            Connect AI key
          </Button>
        </Link>
      )}
    </div>
  );
}

function RefreshBriefingButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full gap-2" disabled={pending}>
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
      {pending ? "Refreshing briefing..." : "Refresh Briefing"}
    </Button>
  );
}
