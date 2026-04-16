"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { CheckCheck, CheckCircle2, Circle, ExternalLink } from "lucide-react";

import { markAllReadAction, toggleReadAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { ManualRefreshTrigger } from "@/components/dashboard/manual-refresh-trigger";
import { GuestValuePreview } from "@/components/guest-value-preview";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { buildEventIntelligenceSignals, isTopEventEligible } from "@/lib/event-intelligence";
import { isAiConfigured } from "@/lib/env";
import { getDisplayStateLabel, getDisplayStateTone } from "@/lib/habit-loop";
import {
  buildPersonalizationMatch,
  buildPersonalizationSummary,
  buildPersonalizationTopicOptions,
  getStoredPersonalizationPayload,
  hasActivePersonalization,
  parsePersonalizationProfile,
  sortBriefingItemsByPersonalization,
  subscribeToPersonalizationStore,
  type PersonalizationMatch,
} from "@/lib/personalization";
import { formatReadingDelta, formatReadingWindow } from "@/lib/reading-window";
import type { BriefingItem, DashboardData, ViewerAccount } from "@/lib/types";
import { cn, formatBriefingDate, minutesToLabel } from "@/lib/utils";

type PersonalizedDashboardProps = {
  searchParams: { generated?: string; allread?: string };
  data: DashboardData;
  viewer: ViewerAccount | null;
};

export default function PersonalizedDashboard({
  searchParams: params,
  data,
  viewer,
}: PersonalizedDashboardProps) {
  const isSignedIn = Boolean(viewer);
  const personalizationPayload = useSyncExternalStore(
    subscribeToPersonalizationStore,
    getStoredPersonalizationPayload,
    () => "",
  );
  const personalizationProfile = useMemo(
    () => (isSignedIn ? parsePersonalizationProfile(personalizationPayload, viewer?.email) : null),
    [isSignedIn, personalizationPayload, viewer?.email],
  );
  const personalizationActive = isSignedIn && hasActivePersonalization(personalizationProfile);
  const sortedItems = useMemo(
    () => sortBriefingItemsByPersonalization(data.briefing.items, personalizationProfile),
    [data.briefing.items, personalizationProfile],
  );

  const topEvents = sortedItems.filter((item) => isTopEventEligible(item)).slice(0, 4);
  const topEventIds = new Set(topEvents.map((item) => item.id));
  const earlySignals = sortedItems.filter((item) => !isTopEventEligible(item));
  const topicBriefs = data.topics.map((topic) => {
    const items = sortedItems.filter((item) => item.topicId === topic.id && !topEventIds.has(item.id));
    return {
      topic,
      confirmed: items.filter((item) => isTopEventEligible(item)).slice(0, 2),
      early: items.filter((item) => !isTopEventEligible(item)).slice(0, 2),
    };
  });

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
  const personalizationSummary = buildPersonalizationSummary(personalizationProfile);
  const trackedTopics = personalizationActive
    ? buildPersonalizationTopicOptions(data.topics, data.briefing.items)
        .filter(
          (topic) =>
            personalizationProfile?.followedTopicIds.includes(topic.id) ||
            personalizationProfile?.followedTopicNames.includes(topic.label),
        )
        .map((topic) => topic.label)
        .slice(0, 4)
    : [];
  const followedEntities = personalizationActive
    ? (personalizationProfile?.followedEntities ?? []).slice(0, 4)
    : [];
  return (
    <AppShell currentPath="/dashboard" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        {!isSignedIn ? <GuestValuePreview ctaLabel="Unlock full briefing" /> : null}
        <PageHeader
          eyebrow={formatBriefingDate(data.briefing.briefingDate)}
          title={isSignedIn ? "Full briefing workspace" : "Today's public briefing"}
          description={
            isSignedIn
              ? "This is the complete Daily Intelligence workspace: confirmed event clusters first, early signals kept separate, visible ranking logic on every card, and the full reading workflow in one place."
              : "You're viewing the public briefing. Sign in to personalize your intelligence and unlock the complete ranked workspace."
          }
          aside={
            <ManualRefreshTrigger
              readingWindow={data.briefing.readingWindow}
              readingMetrics={readingMetrics}
              isAiConfigured={isAiConfigured}
            />
          }
        />

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

        {isSignedIn ? (
          <Panel className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Personalization
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  {personalizationActive ? "Your ranking is tuned to your briefing priorities" : "Add priorities to tune this briefing"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  {personalizationActive
                    ? `${personalizationSummary}. Matching confirmed events can surface earlier for you, but confirmed multi-source quality still decides what belongs in Top Events.`
                    : "Track a few topics or entities and the dashboard will shift strong matching events upward without flooding the briefing with weak coverage."}
                </p>
              </div>
              <Link
                href="/settings#account-settings"
                className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
              >
                Manage personalization
              </Link>
            </div>
            {personalizationActive ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {trackedTopics.map((topic) => (
                  <Badge key={topic} className="text-[#294f86]">
                    Tracking {topic}
                  </Badge>
                ))}
                {followedEntities.map((entity) => (
                  <Badge key={entity} className="text-[#294f86]">
                    Following {entity}
                  </Badge>
                ))}
              </div>
            ) : null}
          </Panel>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <Panel className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {isSignedIn ? "Unlocked view" : "Public briefing"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              {isSignedIn ? "The structured briefing starts here" : "What signing in unlocks"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {isSignedIn
                ? "The dashboard keeps the event-centric scan, topic briefings, reading window, and session status together so the product feels like a working intelligence surface instead of a feed."
                : "Preview the ranked public briefing here, then sign in to unlock personalized topics, saved history, custom alerts, and the complete dashboard workflow."}
            </p>
          </Panel>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StateMetric label="Ranked events" value={data.briefing.items.length} />
            <StateMetric label="Top events" value={topEvents.length} />
            <StateMetric label="Topics active" value={data.topics.length} />
          </div>
        </section>

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
                  <p className="pb-1 text-sm font-medium text-[var(--muted)]">today</p>
                </div>
                <div className="mt-2 flex max-w-full flex-wrap gap-2">
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
                  New signals surface first, updates stay visible, and single-source items are kept separate from the confirmed event layer.
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
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Only event clusters with corroborating source coverage appear here.
                </p>
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
            <div className="mt-5 grid gap-4">
              {topEvents.length ? (
                topEvents.map((event) => (
                  <DashboardEventCard
                    key={event.id}
                    item={event}
                    tone="confirmed"
                    personalization={buildPersonalizationMatch(event, personalizationProfile)}
                    personalizationEnabled={personalizationActive}
                  />
                ))
              ) : (
                <Panel className="border-dashed border-[var(--line)] bg-white/40 p-5 text-sm leading-7 text-[var(--muted)]">
                  No multi-source event clusters qualified yet. Early signals will remain below until more corroborating coverage arrives.
                </Panel>
              )}
            </div>
          </Panel>

          <div className="xl:sticky xl:top-4 xl:self-start">
            <Panel className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Coverage map
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Topic-by-topic event posture for today&apos;s briefing
              </p>
              <div className="mt-4 space-y-3">
                {topicBriefs.map(({ topic, confirmed, early }) => (
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
                        <p className="text-sm font-semibold text-[var(--foreground)]">{topic.name}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{topic.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{confirmed.length} confirmed</Badge>
                      {early.length ? <Badge className="text-[#8a5a11]">{early.length} early</Badge> : null}
                    </div>
                  </a>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Topic briefings
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
              Compact event view by topic
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Each topic is capped so the dashboard stays high-signal rather than turning into a feed.
            </p>
          </div>
          {topicBriefs.map(({ topic, confirmed, early }) => (
            <Panel key={topic.id} id={`topic-${topic.id}`} className="scroll-mt-6 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: topic.color }} />
                  <div>
                    <h2 className="display-font text-2xl text-[var(--foreground)]">{topic.name}</h2>
                    <p className="text-sm text-[var(--muted)]">{topic.description}</p>
                  </div>
                </div>
                <div className="flex max-w-full flex-wrap gap-2">
                  <Badge>{confirmed.length} confirmed events</Badge>
                  {early.length ? <Badge className="text-[#8a5a11]">{early.length} early signals</Badge> : null}
                </div>
              </div>

              {confirmed.length || early.length ? (
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {confirmed.map((item) => (
                    <DashboardEventCard
                      key={item.id}
                      item={item}
                      tone="confirmed"
                      compact
                      personalization={buildPersonalizationMatch(item, personalizationProfile)}
                      personalizationEnabled={personalizationActive}
                    />
                  ))}
                  {early.map((item) => (
                    <DashboardEventCard
                      key={item.id}
                      item={item}
                      tone="early"
                      compact
                      personalization={buildPersonalizationMatch(item, personalizationProfile)}
                      personalizationEnabled={personalizationActive}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[20px] border border-dashed border-[var(--line)] bg-white/40 p-5 text-sm leading-7 text-[var(--muted)]">
                  No updates yet — check back shortly.
                </div>
              )}
            </Panel>
          ))}
        </section>

        {earlySignals.length ? (
          <Panel className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Early signals
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Single-source developments held out of Top Events
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              These stay on the dashboard for awareness, but they are clearly marked until more sources confirm the event cluster.
            </p>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {earlySignals.slice(0, 4).map((item) => (
                <DashboardEventCard
                  key={item.id}
                  item={item}
                  tone="early"
                  compact
                  personalization={buildPersonalizationMatch(item, personalizationProfile)}
                  personalizationEnabled={personalizationActive}
                />
              ))}
            </div>
          </Panel>
        ) : null}

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
                  {sessionSummary?.reviewedCount ?? 0} events reviewed today, with {sessionSummary?.newCount ?? 0} new, {sessionSummary?.changedCount ?? 0} changed, and {sessionSummary?.escalatedCount ?? 0} escalated since your last pass.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Keep scanning
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Mark events as read as you finish them. When everything in today&apos;s briefing is reviewed, this becomes your closure point.
                </p>
              </>
            )}
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}

function DashboardEventCard({
  item,
  tone,
  compact = false,
  personalization,
  personalizationEnabled = false,
}: {
  item: BriefingItem;
  tone: "confirmed" | "early";
  compact?: boolean;
  personalization?: PersonalizationMatch;
  personalizationEnabled?: boolean;
}) {
  const intelligence = buildEventIntelligenceSignals(item);
  const primarySourceUrl = item.relatedArticles?.[0]?.url ?? item.sources.find((source) => isValidStoryUrl(source.url))?.url;
  const displayStateLabel = getDisplayStateLabel(item.displayState);

  return (
    <div className={cn("overflow-hidden rounded-[22px] border bg-white/65 p-5", tone === "early" ? "border-[rgba(138,90,17,0.18)]" : "border-[var(--line)]")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge>{item.topicName}</Badge>
            <Badge className={tone === "early" ? "text-[#8a5a11]" : "text-[var(--accent)]"}>
              {tone === "early" ? "Early Signal" : "Top Event"}
            </Badge>
            {displayStateLabel ? (
              <Badge className={getDisplayStateTone(item.displayState)}>{displayStateLabel}</Badge>
            ) : null}
            <Badge>{intelligence.timelineIndicator}</Badge>
            <Badge className={intelligence.confidenceTone === "developing" ? "text-[#8a5a11]" : "text-[#294f86]"}>
              {intelligence.confidenceLabel}
            </Badge>
            {personalizationEnabled && personalization?.active ? (
              <Badge className="text-[#294f86]">Higher for you</Badge>
            ) : null}
            {item.read ? <Badge className="text-[var(--muted)]">Read</Badge> : null}
          </div>
          <div>
            {primarySourceUrl ? (
              <a
                href={primarySourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-start gap-2 text-xl font-semibold tracking-tight text-[var(--foreground)] underline-offset-4 hover:underline"
              >
                <span className="break-words">{item.title}</span>
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
              </a>
            ) : (
              <h3 className="break-words text-xl font-semibold tracking-tight text-[var(--foreground)]">{item.title}</h3>
            )}
            <p className="mt-2 text-sm leading-7 text-[var(--muted)] line-clamp-3">{item.whatHappened}</p>
          </div>
        </div>

        {item.continuityKey && item.continuityFingerprint ? (
          <form action={toggleReadAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="eventKey" value={item.continuityKey} />
            <input type="hidden" name="continuityFingerprint" value={item.continuityFingerprint} />
            <input
              type="hidden"
              name="importanceScore"
              value={String(Math.round(item.importanceScore ?? item.matchScore ?? 0))}
            />
            <input type="hidden" name="current" value={String(item.read)} />
            <button
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                item.read
                  ? "border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.06)] text-[var(--accent)]"
                  : "border-[var(--line)] bg-white/60 text-[var(--muted)] hover:bg-white",
              )}
            >
              {item.read ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              {item.read ? "Read" : "Mark as read"}
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-4 rounded-[18px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Ranking reason
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{intelligence.rankingReason}</p>
        {item.rankingSignals?.[0] ? (
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.rankingSignals[0]}</p>
        ) : null}
        {personalizationEnabled && personalization?.active && personalization.shortReason ? (
          <p className="mt-2 text-sm leading-6 text-[#294f86]">Higher for you: {personalization.shortReason}</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SignalStat label="Impact" value={intelligence.impactLabel} />
        <SignalStat label="Source diversity" value={intelligence.sourceLabel} />
        <SignalStat label="Timeline" value={intelligence.timelineIndicator} />
        <SignalStat label="Recency" value={intelligence.recencyLabel} />
      </div>

      <div className="mt-4 rounded-[18px] border border-[rgba(19,26,34,0.08)] bg-[rgba(41,79,134,0.05)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#294f86]">Why it matters</p>
        <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{item.whyItMatters}</p>
      </div>

      {intelligence.keyEntities.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Key entities</p>
          <div className="mt-2 flex max-w-full flex-wrap gap-2">
            {intelligence.keyEntities.map((entity) => (
              <span
                key={entity}
                className="inline-flex max-w-full items-center rounded-full border border-[rgba(19,26,34,0.08)] bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] break-words"
              >
                {entity}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-[18px] border border-[rgba(19,26,34,0.08)] bg-white/60 px-4 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Supporting coverage
          </p>
          <p className="text-xs font-medium text-[var(--muted)]">{intelligence.sourceLabel}</p>
        </div>
        <div className="mt-3 space-y-2.5">
          {(item.relatedArticles?.length ? item.relatedArticles : item.sources.map((source) => ({
            title: source.title,
            url: source.url,
            sourceName: source.title,
          })))
            .slice(0, compact ? 3 : 4)
            .map((article) => (
              <a
                key={`${article.sourceName}-${article.title}-${article.url}`}
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-2 rounded-[16px] border border-[rgba(19,26,34,0.06)] bg-white/70 px-3 py-3 transition-colors hover:bg-white sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-6 text-[var(--foreground)]">{article.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{article.sourceName}</p>
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
              </a>
            ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
        <span className="inline-flex items-center rounded-full border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.72)] px-3 py-1.5">
          {minutesToLabel(item.estimatedMinutes)} read
        </span>
        {item.matchedKeywords?.[0] ? (
          <span className="inline-flex items-center rounded-full border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.72)] px-3 py-1.5">
            Signal: {item.matchedKeywords[0]}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SignalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[rgba(19,26,34,0.08)] bg-white/70 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
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
