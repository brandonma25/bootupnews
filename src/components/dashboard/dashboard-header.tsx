"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDashboardLastUpdated, getDashboardStateCopy } from "@/lib/dashboard-state";
import type { DashboardViewState } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_STATE_POLL_MS = 15000;

export function DashboardHeader({
  eyebrow,
  lastUpdatedAt,
  state,
  briefingIntro,
  readingWindow,
  isAiConfigured,
}: {
  eyebrow: string;
  lastUpdatedAt: string;
  state: Exclude<DashboardViewState, "loading">;
  briefingIntro: string;
  readingWindow: string;
  isAiConfigured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [labelNow, setLabelNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLabelNow(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (state !== "empty" || isPending) {
      return;
    }

    const intervalId = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, EMPTY_STATE_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [isPending, router, state]);

  const displayState: DashboardViewState = isPending ? "loading" : state;
  const copy = getDashboardStateCopy(displayState, briefingIntro);
  const lastUpdatedLabel = useMemo(
    () => formatDashboardLastUpdated(lastUpdatedAt, labelNow),
    [labelNow, lastUpdatedAt],
  );

  function refreshDashboard() {
    if (isPending) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <PageHeader
      eyebrow={eyebrow}
      title={copy.title}
      description={copy.description}
      aside={
        <div className="flex min-w-[240px] flex-col items-stretch gap-2">
          <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {state === "ready" ? "Reading window" : "Status"}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
              {state === "ready" ? readingWindow : "Preparing briefing"}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">{lastUpdatedLabel}</p>
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            variant={state === "ready" ? "primary" : "secondary"}
            onClick={refreshDashboard}
            disabled={isPending}
          >
            <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
            {isPending ? "Fetching your intelligence…" : "Refresh"}
          </Button>
          {!isAiConfigured ? (
            <Link
              href="/settings"
              className="text-center text-xs font-medium text-[var(--muted)] underline-offset-4 hover:underline"
            >
              Connect AI key
            </Link>
          ) : null}
        </div>
      }
    />
  );
}
