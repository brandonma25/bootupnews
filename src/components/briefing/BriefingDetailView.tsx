"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DateBadge } from "@/components/signals/DateBadge";
import { SignalCard } from "@/components/signals/SignalCard";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  buildHomepageViewModel,
  buildOverallNoDataMessage,
  type HomepageEvent,
} from "@/lib/homepage-model";
import type { DashboardData, ViewerAccount } from "@/lib/types";
import { getBriefingDateKey } from "@/lib/utils";

export function BriefingDetailView({
  data,
  viewer,
}: {
  data: DashboardData;
  viewer: ViewerAccount | null;
}) {
  const signedIn = Boolean(viewer);
  const { featured, topRanked } = buildHomepageViewModel(data);
  const topEvents = dedupeEvents([featured, ...topRanked]).slice(0, 5);
  const noDataMessage = buildOverallNoDataMessage(topEvents.length);
  const briefingDateKey = getBriefingDateKey(data.briefing.briefingDate);

  return (
    <div className="mx-auto w-full max-w-[var(--bu-container-narrow)] px-[var(--bu-space-2)] py-[var(--bu-space-7)] md:px-0">
      <section className="mb-[var(--bu-space-6)] space-y-5">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </Link>
        <div className="flex items-baseline justify-between gap-4">
          <DateBadge date={new Date(`${briefingDateKey}T12:00:00.000Z`)} />
          <p className="text-[var(--bu-size-meta)] font-medium uppercase tracking-[0.08em] text-[var(--bu-text-tertiary)]">
            Today&apos;s signals
          </p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {!signedIn ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/login?redirectTo=${encodeURIComponent(`/briefing/${data.briefing.briefingDate.slice(0, 10)}`)}`}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/signup?redirectTo=${encodeURIComponent(`/briefing/${data.briefing.briefingDate.slice(0, 10)}`)}`}>
                  Create account
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {topEvents.length ? (
        <div className="grid gap-[var(--bu-space-3)]">
          {topEvents.map((event, index) => (
            <SignalCard
              key={event.id}
              signal={event}
              rank={index + 1}
              tier="core"
              defaultExpanded
            />
          ))}
        </div>
      ) : (
        <StatusPanel title={noDataMessage.title} body={noDataMessage.body} />
      )}
    </div>
  );
}

function dedupeEvents(events: Array<HomepageEvent | null>) {
  const seen = new Set<string>();
  return events.filter((event): event is HomepageEvent => {
    if (!event || seen.has(event.id)) {
      return false;
    }

    seen.add(event.id);
    return true;
  });
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <Panel className="p-5 text-base text-[var(--text-secondary)]">
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      <p className="mt-2">{body}</p>
    </Panel>
  );
}
