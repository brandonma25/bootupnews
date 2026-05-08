"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BriefingCardCategory } from "@/components/home/BriefingCardCategory";
import { CategoryPreviewGrid } from "@/components/home/CategoryPreviewGrid";
import { CategoryTabStrip } from "@/components/home/CategoryTabStrip";
import { DevelopingNow } from "@/components/home/DevelopingNow";
import { MvpMeasurementTracker } from "@/components/mvp-measurement/MvpMeasurementTracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  buildOverallNoDataMessage,
  type HomepageViewModel,
  type HomepageEvent,
} from "@/lib/homepage-model";
import {
  buildIntentionalEditorialPreview,
  type EditorialWhyItMattersContent,
} from "@/lib/editorial-content";
import { trackMvpMeasurementEvent } from "@/lib/mvp-measurement-client";
import type { DashboardData, ViewerAccount } from "@/lib/types";
import { cn, getBriefingDateKey, minutesToLabel } from "@/lib/utils";

type LandingHomepageProps = {
  data: DashboardData;
  viewer: ViewerAccount | null;
  authState?: string;
  debugEnabled?: boolean;
  briefingDateLabel: string;
  homepageViewModel: HomepageViewModel;
};

export default function LandingHomepage({
  data,
  viewer,
  authState,
  debugEnabled = false,
  briefingDateLabel,
  homepageViewModel,
}: LandingHomepageProps) {
  const signedIn = Boolean(viewer);
  const { featured, topRanked, developingNowEvents, categoryPreviewEvents, categorySections, debug } = homepageViewModel;
  const topEvents = dedupeEvents([featured, ...topRanked]);
  const briefingDateKey = getBriefingDateKey(data.briefing.briefingDate);
  const detailHref = `/briefing/${briefingDateKey}`;
  const noDataMessage = buildOverallNoDataMessage(topEvents.length);
  const topEventsEmptyMessage =
    data.homepageFreshnessNotice?.kind === "empty"
      ? { title: data.homepageFreshnessNotice.text, body: "" }
      : noDataMessage;
  const authMessage = getHomepageAuthMessage(authState);

  return (
    <AppShell currentPath="/" mode={data.mode} account={viewer}>
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
      <div className="space-y-5 py-2">
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

        <p className="text-sm font-semibold text-[var(--text-primary)]" data-testid="home-date-label">
          {briefingDateLabel}
        </p>

        {data.homepageFreshnessNotice ? (
          <Panel className="border-[var(--accent)]/30 bg-[var(--card)] p-4" data-testid="home-freshness-notice">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {data.homepageFreshnessNotice.text}
            </p>
          </Panel>
        ) : null}

        <CategoryTabStrip
          topEvents={topEvents}
          categorySections={categorySections}
          isAuthenticated={signedIn}
          gatedCategoryState={({ onDismiss }) => (
            <CategorySoftGate redirectTo="/" onDismiss={onDismiss} />
          )}
          topEventsEmptyState={<StatusPanel title={topEventsEmptyMessage.title} body={topEventsEmptyMessage.body} />}
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

        <DevelopingNow events={developingNowEvents} />

        <CategoryPreviewGrid categoryPreviews={categoryPreviewEvents} />

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
  const titleNormalized = event.title.trim();
  const keyPoints = Array.isArray(event.keyPoints)
    ? getDistinctKeyPoints(event.keyPoints, [event.title, event.summary, event.whatHappened])
    : [];
  const sourceNames = event.relatedArticles
    .map((article) => article.sourceName.trim())
    .filter(Boolean)
    .slice(0, 4);
  const whyItMatters = event.whyItMatters.trim();

  return (
    <Panel
      className={cn(
        "h-full p-5 transition-colors hover:border-[var(--text-secondary)]",
        featured && "p-6",
      )}
    >
      <article className="space-y-4" data-testid="home-top-event-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-[var(--bg)] text-base font-semibold text-[var(--text-primary)]">
              #{rank}
            </span>
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-normal text-[var(--text-secondary)]">Core Signal</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{event.topicName}</Badge>
              </div>
            </div>
          </div>
          <Link
            href={detailHref}
            className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
            data-mvp-measurement-event="signal_details_click"
            data-mvp-route="/"
            data-mvp-surface="home_top_event"
            data-mvp-signal-post-id={event.id}
            data-mvp-signal-slug={event.title}
            data-mvp-signal-rank={rank}
            data-mvp-briefing-date={detailHref.replace("/briefing/", "")}
          >
            Details
          </Link>
        </div>

        <div>
          <h2 className="briefing-title text-[var(--text-primary)]">{event.title}</h2>
          {event.summary && event.summary.trim() !== titleNormalized ? (
            <p className="mt-3 text-base text-[var(--text-secondary)]">{event.summary}</p>
          ) : null}
        </div>

        {keyPoints.length ? (
          <ul
            className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-primary)]"
            data-testid="home-top-event-key-points"
          >
            {keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        ) : null}

        {whyItMatters ? (
          <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] px-4 py-4">
            <p className="text-xs font-semibold tracking-normal text-[var(--text-secondary)]">
              Why this ranks
            </p>
            <WhyItMattersPreview
              text={whyItMatters}
              structuredContent={event.editorialWhyItMatters}
              measurement={{
                route: "/",
                surface: "home_top_event",
                signalPostId: event.id,
                signalSlug: event.title,
                signalRank: rank,
                briefingDate: detailHref.replace("/briefing/", ""),
              }}
            />
          </div>
        ) : null}

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
                  data-mvp-measurement-event="source_click"
                  data-mvp-route="/"
                  data-mvp-surface="home_top_event_supporting_coverage"
                  data-mvp-signal-post-id={event.id}
                  data-mvp-signal-slug={event.title}
                  data-mvp-signal-rank={rank}
                  data-mvp-briefing-date={detailHref.replace("/briefing/", "")}
                  data-mvp-source-name={article.sourceName}
                >
                  <span className="min-w-0">
                    <span className="font-semibold">{article.sourceName}</span>
                    {article.title && article.title.trim() !== article.sourceName.trim() ? (
                      <span className="text-[var(--text-secondary)]">: {article.title}</span>
                    ) : null}
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

function getDistinctKeyPoints(points: string[], comparisons: string[]) {
  const seen = new Set<string>();

  return points
    .map((point) => point.trim())
    .filter((point) => {
      const normalizedPoint = normalizeReaderCopy(point);

      if (!normalizedPoint || seen.has(normalizedPoint)) {
        return false;
      }

      seen.add(normalizedPoint);
      return comparisons.every((comparison) => isMateriallyDistinctReaderCopy(normalizedPoint, comparison));
    });
}

function isMateriallyDistinctReaderCopy(normalizedPoint: string, comparison: string) {
  const normalizedComparison = normalizeReaderCopy(comparison);

  if (!normalizedComparison || normalizedPoint === normalizedComparison) {
    return !normalizedComparison;
  }

  const shorter = normalizedPoint.length < normalizedComparison.length ? normalizedPoint : normalizedComparison;
  const longer = shorter === normalizedPoint ? normalizedComparison : normalizedPoint;

  if (shorter.length < 40) {
    return true;
  }

  return !(longer.startsWith(shorter) && shorter.length / longer.length >= 0.85);
}

function normalizeReaderCopy(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[.…]+$/g, "")
    .trim()
    .toLowerCase();
}

const WHY_IT_MATTERS_PREVIEW_THRESHOLD = 220;

function WhyItMattersPreview({
  text,
  structuredContent,
  measurement,
}: {
  text: string;
  structuredContent?: EditorialWhyItMattersContent | null;
  measurement: {
    route: string;
    surface: string;
    signalPostId: string;
    signalSlug: string;
    signalRank: number;
    briefingDate: string;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const normalizedText = text.trim();
  const structuredExpandedContent = getStructuredExpandedContent(structuredContent);
  const shouldCollapse =
    Boolean(structuredExpandedContent) || normalizedText.length > WHY_IT_MATTERS_PREVIEW_THRESHOLD;
  const collapsedPreview = buildIntentionalEditorialPreview(
    normalizedText,
    WHY_IT_MATTERS_PREVIEW_THRESHOLD,
  );
  const displayedPreview = collapsedPreview === normalizedText ? normalizedText : collapsedPreview;
  const sections = expanded && !structuredExpandedContent ? formatWhyItMattersSections(normalizedText) : [];

  return (
    <div className="mt-3">
      {expanded && structuredExpandedContent ? (
        <StructuredWhyItMattersContent content={structuredExpandedContent} />
      ) : expanded ? (
        <div
          className="space-y-3 border-l-2 border-[var(--border)] pl-3 text-[0.98rem] leading-7 text-[var(--text-primary)]"
          data-testid="home-why-it-matters-text"
        >
          {sections.map((section, index) => (
            <p key={`${index}-${section.slice(0, 24)}`}>{section}</p>
          ))}
        </div>
      ) : (
        <p
          className="line-clamp-2 text-base leading-7 text-[var(--text-primary)]"
          data-testid="home-why-it-matters-text"
        >
          {shouldCollapse ? collapsedPreview : displayedPreview}
        </p>
      )}
      {shouldCollapse ? (
        <button
          type="button"
          aria-expanded={expanded}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          onClick={() => {
            if (!expanded) {
              void trackMvpMeasurementEvent({
                eventName: "signal_full_expansion_proxy",
                ...measurement,
                metadata: {
                  proxyReason: "homepage_why_it_matters_read_more",
                  hasStructuredWhyItMatters: Boolean(structuredExpandedContent),
                },
              });
            }
            setExpanded((current) => !current);
          }}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

function StructuredWhyItMattersContent({
  content,
}: {
  content: EditorialWhyItMattersContent;
}) {
  return (
    <div
      className="space-y-4 border-l-2 border-[var(--border)] pl-3 text-[0.98rem] leading-7 text-[var(--text-primary)]"
      data-testid="home-why-it-matters-text"
    >
      {content.thesis ? <p className="font-medium">{content.thesis}</p> : null}
      {content.sections.map((section, index) => (
        <section key={`${index}-${section.title}`} className="space-y-1.5">
          {section.title ? (
            <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
              {section.title}
            </h3>
          ) : null}
          {section.body ? <p>{section.body}</p> : null}
        </section>
      ))}
    </div>
  );
}

function getStructuredExpandedContent(
  content: EditorialWhyItMattersContent | null | undefined,
) {
  if (!content?.thesis && !content?.sections.length) {
    return null;
  }

  return content;
}

function formatWhyItMattersSections(text: string) {
  const explicitParagraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (explicitParagraphs.length > 1) {
    return explicitParagraphs;
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  const sentences = normalized
    .match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [normalized];

  if (sentences.length < 3) {
    return [normalized];
  }

  return sentences;
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
          <p className="text-base font-semibold text-[var(--text-primary)]">
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
      <p className="font-semibold text-[var(--text-primary)]">{title}</p>
      {body ? <p className="mt-2">{body}</p> : null}
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
