"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { BriefingCardCategory } from "@/components/home/BriefingCardCategory";
import { CategoryTabStrip } from "@/components/home/CategoryTabStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  buildHomepageViewModel,
  buildOverallNoDataMessage,
  type HomepageEvent,
} from "@/lib/homepage-model";
import type { DashboardData, ViewerAccount } from "@/lib/types";
import { cn, formatBriefingDate, minutesToLabel } from "@/lib/utils";

export function BriefingDetailView({
  data,
  viewer,
}: {
  data: DashboardData;
  viewer: ViewerAccount | null;
}) {
  const signedIn = Boolean(viewer);
  const { featured, topRanked, categorySections } = buildHomepageViewModel(data);
  const topEvents = dedupeEvents([featured, ...topRanked]);
  const noDataMessage = buildOverallNoDataMessage(topEvents.length);

  return (
    <div className="space-y-6 py-2">
      <section className="space-y-4 border-b border-[var(--border)] pb-5">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge>{formatBriefingDate(data.briefing.briefingDate)}</Badge>
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] md:text-[32px] md:leading-[1.25]">
              {data.briefing.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge>{topEvents.length} {topEvents.length === 1 ? "top event" : "top events"}</Badge>
              <Badge>{data.briefing.readingWindow}</Badge>
            </div>
          </div>
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

      <CategoryTabStrip
        topEvents={topEvents}
        categorySections={categorySections}
        isAuthenticated={signedIn}
        gatedCategoryState={<CategorySoftGate redirectTo={`/briefing/${data.briefing.briefingDate.slice(0, 10)}`} />}
        topEventsEmptyState={<StatusPanel title={noDataMessage.title} body={noDataMessage.body} />}
        renderTopEvent={(event, index) => (
          <BriefingEventDetailCard event={event} rank={index + 1} featured={index === 0} />
        )}
        renderCategoryEvent={(event) => (
          <BriefingCardCategory
            item={{
              title: event.title,
              whatHappened: event.whatHappened,
              sources: event.relatedArticles.map((article) => ({
                title: article.sourceName,
                url: article.url,
              })),
            }}
          />
        )}
      />
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

function BriefingEventDetailCard({
  event,
  rank,
  featured,
}: {
  event: HomepageEvent;
  rank: number;
  featured: boolean;
}) {
  return (
    <div
      className={cn("rounded-card border border-transparent bg-[var(--card)] p-5", featured && "p-6")}
      data-testid="briefing-detail-card"
    >
      <article className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-[var(--bg)] text-base font-semibold text-[var(--text-primary)]">
              #{rank}
            </span>
            <div className="space-y-2">
              <p className="section-label">Top Event</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{event.topicName}</Badge>
                <Badge>{event.intelligence.sourceLabel}</Badge>
                <Badge>{event.intelligence.confidenceLabel}</Badge>
                <Badge>{event.intelligence.timelineIndicator}</Badge>
              </div>
            </div>
          </div>
          <Badge>{minutesToLabel(event.estimatedMinutes)} read</Badge>
        </div>

        <div>
          <h2 className="briefing-detail-title text-[var(--text-primary)]">{event.title}</h2>
          <p className="mt-3 text-base text-[var(--text-secondary)]">{event.summary}</p>
        </div>

        <section className="space-y-2">
          <p className="section-label">What happened</p>
          <p className="text-base text-[var(--text-primary)]">{event.whatHappened}</p>
        </section>

        <section className="rounded-card border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
          <p className="section-label">Why it matters</p>
          <p className="mt-2 text-base text-[var(--text-primary)]">{event.whyItMatters}</p>
          <p className="mt-3 section-label">Why this ranks here</p>
          <p className="mt-2 text-base text-[var(--text-secondary)]">{event.whyThisIsHere}</p>
        </section>

        {event.rankingSignals.length ? (
          <section className="space-y-2">
            <p className="section-label">Ranking signals</p>
            <div className="flex flex-wrap gap-2">
              {event.rankingSignals.slice(0, 4).map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                >
                  {signal}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {event.relatedArticles.length ? (
          <section className="space-y-3">
            <p className="section-label">Supporting coverage</p>
            <div className="space-y-2">
              {event.relatedArticles.map((article) => (
                <a
                  key={`${article.sourceName}-${article.url}-${article.title}`}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-3 rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--text-secondary)]"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">{article.sourceName}</span>
                    <span className="text-[var(--text-secondary)]">: {article.title}</span>
                  </span>
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}

function CategorySoftGate({ redirectTo }: { redirectTo: string }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Sign in to view category briefing details
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Top Events stay public. Category-level detail requires an account.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}>Sign in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}>Create account</Link>
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <Panel className="p-5 text-base text-[var(--text-secondary)]">
      <p className="font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2">{body}</p>
    </Panel>
  );
}
