"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CategoryTabStrip } from "@/components/home/CategoryTabStrip";
import { MvpMeasurementTracker } from "@/components/mvp-measurement/MvpMeasurementTracker";
import { DateBadge } from "@/components/signals/DateBadge";
import { SignalCard } from "@/components/signals/SignalCard";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  buildOverallNoDataMessage,
  type HomepageViewModel,
  type HomepageEvent,
} from "@/lib/homepage-model";
import type { DashboardData, HomepageCategoryArticle, ViewerAccount } from "@/lib/types";
import { getBriefingDateKey } from "@/lib/utils";

type LandingHomepageProps = {
  data: DashboardData;
  viewer: ViewerAccount | null;
  isAdmin?: boolean;
  authState?: string;
  debugEnabled?: boolean;
  homepageViewModel: HomepageViewModel;
};

export default function LandingHomepage({
  data,
  viewer,
  isAdmin = false,
  authState,
  debugEnabled = false,
  homepageViewModel,
}: LandingHomepageProps) {
  const signedIn = Boolean(viewer);
  const { featured, topRanked, categorySections, debug } = homepageViewModel;
  const topEvents = dedupeEvents([featured, ...topRanked]).slice(0, 5);
  const briefingDateKey = getBriefingDateKey(data.briefing.briefingDate);
  const detailHref = `/briefing/${briefingDateKey}`;
  const noDataMessage = buildOverallNoDataMessage(topEvents.length);
  const topEventsEmptyMessage =
    data.homepageFreshnessNotice?.kind === "empty"
      ? { title: data.homepageFreshnessNotice.text, body: "" }
      : noDataMessage;
  const authMessage = getHomepageAuthMessage(authState);

  return (
    <AppShell currentPath="/" mode={data.mode} account={viewer} isAdmin={isAdmin}>
      <MvpMeasurementTracker
        pageView={{
          eventName: "homepage_view",
          route: "/",
          surface: "home",
          briefingDate: briefingDateKey,
          metadata: {
            visibleSignalCount: topEvents.length,
            publicRankedSignalCount: data.publicRankedItems?.length ?? topEvents.length,
            coreSignalCount: homepageViewModel.debug.coreSignalCount,
            contextSignalCount: homepageViewModel.debug.contextSignalCount,
            rendersCoreAndContext: homepageViewModel.debug.coreSignalCount >= 5 && homepageViewModel.debug.contextSignalCount >= 2,
          },
        }}
      />
      <div className="mx-auto w-full max-w-[var(--bu-container-narrow)] px-[var(--bu-space-2)] py-[var(--bu-space-7)] md:px-0">
        {authMessage ? (
          <Panel className="mb-[var(--bu-space-5)] p-4" role="alert">
            <p className="text-sm font-medium text-[var(--bu-text-primary)]">{authMessage}</p>
            <Link
              href="/login"
              className="mt-2 inline-flex text-sm font-medium text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-accent)]"
            >
              Return to login
            </Link>
          </Panel>
        ) : null}

        <header className="mb-[var(--bu-space-6)] flex items-baseline justify-between gap-4">
          <DateBadge date={parseBriefingDate(data.briefing.briefingDate)} />
          <h1 className="text-[var(--bu-size-meta)] font-medium uppercase tracking-[0.08em] text-[var(--bu-text-tertiary)]">
            Today&apos;s signals
          </h1>
        </header>

        {data.homepageFreshnessNotice ? (
          <Panel className="mb-[var(--bu-space-5)] p-4" data-testid="home-freshness-notice">
            <p className="text-sm font-medium text-[var(--bu-text-primary)]">
              {data.homepageFreshnessNotice.text}
            </p>
          </Panel>
        ) : null}

        {topEvents.length ? (
          <div className="grid gap-[var(--bu-space-3)]">
            {topEvents.map((event, index) => (
              <SignalCard
                key={event.id}
                signal={event}
                rank={index + 1}
                tier="core"
                defaultExpanded={false}
                trackingAttributes={{
                  "data-mvp-measurement-event": "signal_details_click",
                  "data-mvp-route": "/",
                  "data-mvp-surface": "home_top_event",
                  "data-mvp-signal-post-id": event.id,
                  "data-mvp-signal-slug": event.title,
                  "data-mvp-signal-rank": index + 1,
                  "data-mvp-briefing-date": briefingDateKey,
                }}
              />
            ))}
          </div>
        ) : (
          <StatusPanel title={topEventsEmptyMessage.title} body={topEventsEmptyMessage.body} />
        )}

        <div className="mt-[var(--bu-space-7)]">
          <CategoryTabStrip
            demoted
            topEvents={topEvents}
            categorySections={categorySections}
            isAuthenticated={signedIn}
            gatedCategoryState={({ onDismiss }) => (
              <CategorySoftGate redirectTo="/" onDismiss={onDismiss} />
            )}
            topEventsEmptyState={<StatusPanel title={noDataMessage.title} body={noDataMessage.body} />}
            renderTopEvent={(event) => <SignalCard signal={event} compact />}
            renderCategoryEvent={(event, section, index) => (
              <SignalCard
                signal={event}
                compact
                rank={index + 1}
                tier={event.signalRole === "context" ? "context" : "core"}
                readMoreHref={detailHref}
              />
            )}
            renderCategoryArticle={(article) => <CategoryArticleRow article={article} />}
          />
        </div>

        {debugEnabled ? (
          <Panel className="mt-[var(--bu-space-5)] p-5">
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

function CategoryArticleRow({ article }: { article: HomepageCategoryArticle }) {
  const summary = article.summary.trim();

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--text-secondary)]"
      data-mvp-measurement-event="source_click"
      data-mvp-route="/"
      data-mvp-surface={`home_${article.category}_article_tab`}
      data-mvp-source-name={article.sourceName}
    >
      <article className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[var(--text-secondary)]">
          <span>{formatArticleDate(article.publishedAt)}</span>
          <span aria-hidden="true">/</span>
          <span>{article.sourceName}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-medium leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">
            {article.title}
          </h3>
          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
        </div>
        {summary ? (
          <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{summary}</p>
        ) : null}
      </article>
    </a>
  );
}

function formatArticleDate(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Latest";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Taipei",
  }).format(new Date(timestamp));
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

function parseBriefingDate(value: string) {
  const dateKey = getBriefingDateKey(value);
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function CategorySoftGate({
  redirectTo,
  onDismiss,
}: {
  redirectTo: string;
  onDismiss: () => void;
}) {
  return (
    <Panel className="p-5" data-testid="category-soft-gate">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-base font-medium text-[var(--text-primary)]">
            Sign up to be notified when new signals are published.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-9 w-9 shrink-0 rounded-button px-0"
          aria-label="Dismiss category gate"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}>Sign Up</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}>Sign In</Link>
        </Button>
      </div>
    </Panel>
  );
}

function StatusPanel({ title, body }: { title: string; body?: string }) {
  return (
    <Panel className="p-5 text-base text-[var(--text-secondary)]">
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      {body ? <p className="mt-2">{body}</p> : null}
    </Panel>
  );
}

function DebugStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="section-label">{label}</p>
      <p className="mt-2 text-xl font-medium text-[var(--text-primary)]">{value}</p>
    </div>
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
