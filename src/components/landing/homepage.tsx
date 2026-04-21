"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AppShell } from "@/components/app-shell";
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
import { cn, formatBriefingDate, getBriefingDateKey, minutesToLabel } from "@/lib/utils";

type LandingHomepageProps = {
  data: DashboardData;
  viewer: ViewerAccount | null;
  authState?: string;
  debugEnabled?: boolean;
};

export default function LandingHomepage({
  data,
  viewer,
  authState,
  debugEnabled = false,
}: LandingHomepageProps) {
  const signedIn = Boolean(viewer);
  const { featured, topRanked, categorySections, earlySignals, debug } =
    buildHomepageViewModel(data);
  const topEvents = dedupeEvents([featured, ...topRanked]);
  const briefingDateKey = getBriefingDateKey(data.briefing.briefingDate);
  const detailHref = `/briefing/${briefingDateKey}`;
  const noDataMessage = buildOverallNoDataMessage(topEvents.length);
  const authMessage = getHomepageAuthMessage(authState);

  return (
    <AppShell currentPath="/" mode={data.mode} account={viewer}>
      <div className="space-y-6 py-2">
        <section className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge>Daily Intelligence</Badge>
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] md:text-[32px] md:leading-[1.25]">
              Today&apos;s briefing
            </h1>
            <p className="max-w-2xl text-base text-[var(--text-secondary)]">
              Top Events are public. Category briefings, saved history, and account controls unlock after sign-in.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge>{formatBriefingDate(data.briefing.briefingDate)}</Badge>
              <Badge>{topEvents.length} {topEvents.length === 1 ? "top event" : "top events"}</Badge>
              {earlySignals.length ? <Badge>{earlySignals.length} early signals</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={detailHref}>Open full briefing</Link>
            </Button>
            {!signedIn ? (
              <Button asChild>
                <Link href={`/login?redirectTo=${encodeURIComponent(detailHref)}`}>
                  Sign in
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        {authMessage ? (
          <Panel className="p-4" role="alert">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{authMessage}</p>
            <Link
              href="/login"
              className="mt-2 inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Return to login
            </Link>
          </Panel>
        ) : null}

        <CategoryTabStrip
          topEvents={topEvents}
          categorySections={categorySections}
          isAuthenticated={signedIn}
          gatedCategoryState={<CategorySoftGate redirectTo="/" />}
          topEventsEmptyState={<StatusPanel title={noDataMessage.title} body={noDataMessage.body} />}
          renderTopEvent={(event, index) => (
            <HomeTopEventCard
              event={event}
              rank={index + 1}
              detailHref={detailHref}
              featured={index === 0}
            />
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

        {debugEnabled ? (
          <Panel className="p-5">
            <p className="section-label">Homepage diagnostics</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <DebugStat label="Ranked events" value={debug.rankedEventsCount} />
              <DebugStat label="Tech" value={debug.categoryCounts.tech} />
              <DebugStat label="Finance" value={debug.categoryCounts.finance} />
              <DebugStat label="Politics" value={debug.categoryCounts.politics} />
            </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
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

function HomeTopEventCard({
  event,
  rank,
  detailHref,
  featured,
}: {
  event: HomepageEvent;
  rank: number;
  detailHref: string;
  featured: boolean;
}) {
  const sourceNames = event.relatedArticles
    .map((article) => article.sourceName.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Panel
      className={cn(
        "h-full p-5 transition-colors hover:border-[var(--text-secondary)]",
        featured && "p-6",
      )}
    >
      <article className="space-y-4">
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
              </div>
            </div>
          </div>
          <Link
            href={detailHref}
            className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Details
          </Link>
        </div>

        <div>
          <h2 className="briefing-title text-[var(--text-primary)]">{event.title}</h2>
          <p className="mt-3 text-base text-[var(--text-secondary)]">{event.summary}</p>
        </div>

        <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
          <p className="section-label">Why it matters</p>
          <p className="mt-2 text-base text-[var(--text-primary)]">{event.whyItMatters}</p>
        </div>

        {sourceNames.length ? (
          <div className="flex flex-wrap gap-2">
            {sourceNames.map((sourceName) => (
              <span
                key={sourceName}
                className="inline-flex max-w-full items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] break-words"
              >
                {sourceName}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <MetaPill>{minutesToLabel(event.estimatedMinutes)} read</MetaPill>
          <MetaPill>{event.intelligence.impactLabel}</MetaPill>
          <MetaPill>{event.intelligence.recencyLabel}</MetaPill>
        </div>

        {event.relatedArticles.length ? (
          <div className="border-t border-[var(--border)] pt-4">
            <p className="section-label">Supporting coverage</p>
            <div className="mt-3 space-y-2">
              {event.relatedArticles.slice(0, 3).map((article) => (
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
          </div>
        ) : null}
      </article>
    </Panel>
  );
}

function CategorySoftGate({ redirectTo }: { redirectTo: string }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Sign in to view category briefings
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Top Events stay public. Tech, finance, and politics tabs require an account.
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

function DebugStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="section-label">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
      {children}
    </span>
  );
}

function getHomepageAuthMessage(authState?: string) {
  switch (authState) {
    case "oauth-error":
      return "Google sign-in could not be started. Check the auth provider configuration and try again.";
    case "callback-error":
      return "The sign-in callback could not be completed. Try signing in again.";
    case "signup-error":
      return "We could not finish account creation. Try again.";
    case "invalid":
      return "That sign-in attempt was not accepted. Try again.";
    case "config-error":
      return "Authentication is not configured for this environment yet.";
    default:
      return null;
  }
}
