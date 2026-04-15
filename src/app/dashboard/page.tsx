import type { Metadata } from "next";
import { CheckCheck, ExternalLink } from "lucide-react";

import { markAllReadAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { GuestValuePreview } from "@/components/guest-value-preview";
import { StoryCard } from "@/components/story-card";
import { AppShell } from "@/components/app-shell";
import { ManualRefreshTrigger } from "@/components/dashboard/manual-refresh-trigger";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDisplayStateLabel, getDisplayStateTone } from "@/lib/habit-loop";
import { getDashboardData, getViewerAccount } from "@/lib/data";
import { isAiConfigured } from "@/lib/env";
import { formatReadingDelta, formatReadingWindow } from "@/lib/reading-window";
import { formatBriefingDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Today's Briefing — Daily Intelligence",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; allread?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData();
  const viewer = await getViewerAccount();
  const isSignedIn = Boolean(viewer);

  // Deduplicate: top-priority items shown in priority scan, not repeated in topic sections
  const topEvents = data.briefing.items.filter((item) => item.priority === "top");
  const topEventIds = new Set(topEvents.map((item) => item.id));
  const grouped = data.topics.map((topic) => ({
    topic,
    items: data.briefing.items
      .filter((item) => item.topicId === topic.id && !topEventIds.has(item.id))
      .sort((left, right) => {
        const scoreDelta = (right.matchScore ?? 0) - (left.matchScore ?? 0);
        if (scoreDelta !== 0) return scoreDelta;
        const rightPublished = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
        const leftPublished = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
        return rightPublished - leftPublished;
      }),
  }));

  const trackableItems = data.briefing.items.filter(
    (item) => item.continuityKey && item.continuityFingerprint,
  );
  const canTrackProgress = data.mode === "live" && trackableItems.length > 0;
  const isCaughtUp = canTrackProgress && trackableItems.every((item) => item.read);
  const sessionSummary = data.briefing.sessionSummary;
  const readingMetrics = data.briefing.readingMetrics;
  const serializedEventStates = JSON.stringify(
    trackableItems.map((item) => ({
      eventKey: item.continuityKey,
      continuityFingerprint: item.continuityFingerprint,
      importanceScore: Math.round(item.importanceScore ?? item.matchScore ?? 0),
    })),
  );

  return (
    <AppShell currentPath="/dashboard" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        {!isSignedIn ? <GuestValuePreview /> : null}
        <PageHeader
          eyebrow={formatBriefingDate(data.briefing.briefingDate)}
          title={data.briefing.title}
          description={
            isSignedIn
              ? data.briefing.intro
              : `${data.briefing.intro} You can preview the ranked public briefing below before you personalize it.`
          }
          aside={
            <ManualRefreshTrigger
              readingWindow={data.briefing.readingWindow}
              readingMetrics={readingMetrics}
              isAiConfigured={isAiConfigured}
            />
          }
        />

        {/* Feedback banners */}
        {params.generated === "1" ? (
          <div className="rounded-[22px] border border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.06)] px-5 py-4 text-sm font-medium text-[var(--accent)]">
            Fresh briefing generated successfully.
          </div>
        ) : null}
        {params.allread === "1" ? (
          <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm font-medium text-[var(--foreground)]">
            All events marked as read.
          </div>
        ) : null}

        {readingMetrics ? (
          <Panel className="p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Reading window
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <h2 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                    {formatReadingWindow(readingMetrics.totalMinutes)}
                  </h2>
                  <p className="pb-1 text-sm font-medium text-[var(--muted)]">
                    today
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{formatReadingDelta(readingMetrics.deltaVsYesterday)}</Badge>
                  <Badge>{readingMetrics.intensity} day</Badge>
                </div>
              </div>
              <div className="min-w-0 xl:w-[360px]">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-medium text-[var(--foreground)]">
                    {readingMetrics.progressLabel}
                  </p>
                  <p className="text-[var(--muted)]">
                    {Math.round(readingMetrics.progressRatio * 100)}%
                  </p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[rgba(31,79,70,0.08)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                    style={{ width: `${Math.round(readingMetrics.progressRatio * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {readingMetrics.remainingMinutes === 0
                    ? "All reading minutes for today are complete."
                    : `${readingMetrics.remainingMinutes} min remaining in today’s scan.`}
                </p>
              </div>
            </div>
          </Panel>
        ) : null}

        {sessionSummary ? (
          <Panel className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Since your last pass
                </p>
                <h2 className="mt-1.5 text-xl font-semibold text-[var(--foreground)]">
                  What changed since yesterday
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  New signals are surfaced first, updates stay visible, and the feed closes with a calm caught-up moment.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StateMetric label="Reviewed" value={sessionSummary.reviewedCount} />
                <StateMetric label="New" value={sessionSummary.newCount} />
                <StateMetric label="Changed" value={sessionSummary.changedCount} />
                <StateMetric label="Escalated" value={sessionSummary.escalatedCount} />
              </div>
            </div>
          </Panel>
        ) : null}

        {/* Priority scan + coverage map */}
        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Priority scan
                </p>
                <h2 className="mt-1.5 text-xl font-semibold text-[var(--foreground)]">
                  Top events today
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{topEvents.length} {topEvents.length === 1 ? "event" : "events"}</Badge>
                {canTrackProgress && !isCaughtUp ? (
                  <form action={markAllReadAction}>
                    <input type="hidden" name="briefingId" value={data.briefing.id} />
                    <input type="hidden" name="eventStates" value={serializedEventStates} />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/60 px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-white"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {topEvents.map((event) => {
                const primarySourceUrl = event.sources.find((source) => isValidStoryUrl(source.url))?.url;
                const sourceCount = event.sourceCount ?? event.sources.length;

                return (
                  <div
                    key={event.id}
                    className="rounded-[20px] border border-[var(--line)] bg-white/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{event.topicName}</Badge>
                      <Badge className="text-[var(--accent)]">Top event</Badge>
                      {getDisplayStateLabel(event.displayState) ? (
                        <Badge className={getDisplayStateTone(event.displayState)}>
                          {getDisplayStateLabel(event.displayState)}
                        </Badge>
                      ) : null}
                      <Badge>{sourceCount} {sourceCount === 1 ? "source" : "sources"}</Badge>
                    </div>
                    {primarySourceUrl ? (
                      <a
                        href={primarySourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-start gap-2 text-base font-semibold leading-snug text-[var(--foreground)] underline-offset-4 hover:underline"
                      >
                        <span>{event.title}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                      </a>
                    ) : (
                      <div className="mt-3">
                        <h3 className="text-base font-semibold leading-snug text-[var(--foreground)]">
                          {event.title}
                        </h3>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                          Source unavailable
                        </p>
                      </div>
                    )}
                    {event.matchedKeywords?.length ? (
                      <p className="mt-2 text-sm font-medium text-[var(--accent)]">
                        Matched on: {event.matchedKeywords.join(", ")}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)] line-clamp-2">
                      {event.whatHappened}
                    </p>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Coverage map — sticky on desktop */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            <Panel className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Coverage map
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Events by topic in today&apos;s briefing
              </p>
              <div className="mt-4 space-y-3">
                {grouped.map(({ topic }) => {
                  const total = data.briefing.items.filter((i) => i.topicId === topic.id).length;
                  return (
                    <a
                      key={topic.id}
                      href={`#topic-${topic.id}`}
                      className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-white/60 px-4 py-3 transition-colors hover:bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: topic.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {topic.name}
                          </p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {topic.description}
                          </p>
                        </div>
                      </div>
                      <Badge>{total} {total === 1 ? "event" : "events"}</Badge>
                    </a>
                  );
                })}
              </div>
            </Panel>
          </div>
        </section>

        {/* Topic sections — deduplicated */}
        <section className="space-y-6">
          {grouped.map(({ topic, items }) => (
            <div key={topic.id} id={`topic-${topic.id}`} className="scroll-mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: topic.color }}
                />
                <div>
                  <h2 className="display-font text-2xl text-[var(--foreground)]">
                    {topic.name}
                  </h2>
                </div>
                <p className="hidden text-sm text-[var(--muted)] md:block">{topic.description}</p>
              </div>
              {items.length ? (
                <div className="grid gap-4">
                  {items.map((item) => (
                    <StoryCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
                  <p className="font-medium text-[var(--foreground)]">No clustered events yet for this topic.</p>
                  <p>Try adjusting keywords or refreshing your briefing.</p>
                </Panel>
              )}
            </div>
          ))}
        </section>

        {canTrackProgress ? (
          <Panel className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Session status
            </p>
            {isCaughtUp ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  You&apos;re caught up
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {sessionSummary?.reviewedCount ?? 0} events reviewed today, with {sessionSummary?.newCount ?? 0} new,{" "}
                  {sessionSummary?.changedCount ?? 0} changed, and {sessionSummary?.escalatedCount ?? 0} escalated since your last pass.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Keep scanning
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Mark events as read as you finish them. When everything in today&apos;s feed is reviewed, this becomes your closure point.
                </p>
              </>
            )}
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}

function StateMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-white/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function isValidStoryUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
