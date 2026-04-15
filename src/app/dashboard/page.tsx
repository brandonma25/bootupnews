import type { Metadata } from "next";
import { CheckCheck } from "lucide-react";

import { markAllReadAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { StoryCard } from "@/components/story-card";
import { AppShell } from "@/components/app-shell";
import { ManualRefreshTrigger } from "@/components/dashboard/manual-refresh-trigger";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDashboardData, getViewerAccount } from "@/lib/data";
import { isAiConfigured } from "@/lib/env";
import { compareBriefingItemsByRanking } from "@/lib/ranking";
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
  const rankedItems = data.briefing.items.slice().sort(compareBriefingItemsByRanking);

  // Keep dashboard ordering tied to the same ranking activation logic used by the homepage.
  const topEvents = rankedItems.slice(0, 5);
  const topEventIds = new Set(topEvents.map((item) => item.id));
  const grouped = data.topics.map((topic) => ({
    topic,
    items: rankedItems
      .filter((item) => item.topicId === topic.id && !topEventIds.has(item.id))
      .sort(compareBriefingItemsByRanking),
  }));

  const allRead = data.briefing.items.length > 0 && data.briefing.items.every((item) => item.read);
  const isLiveBriefing = !data.briefing.id.startsWith("generated-");

  return (
    <AppShell currentPath="/dashboard" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow={formatBriefingDate(data.briefing.briefingDate)}
          title="Full briefing workspace"
          description="This is the complete Daily Intelligence product experience: the full ranked briefing, deeper event cards, topic navigation, and the place where personalization-ready workflow lives."
          aside={
            <ManualRefreshTrigger
              readingWindow={data.briefing.readingWindow}
              isAiConfigured={isAiConfigured}
            />
          }
        />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <Panel className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Unlocked view
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              The full ranked briefing starts here
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Unlike the public homepage preview, the dashboard carries the complete ranked event stack, full cards, topic sections, and briefing utilities in one working environment.
            </p>
          </Panel>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <MetricPanel label="Ranked events" value={String(data.briefing.items.length)} detail="Total events in this briefing run" />
            <MetricPanel label="Top events" value={String(topEvents.length)} detail="Priority stories surfaced first" />
            <MetricPanel label="Topics active" value={String(data.topics.length)} detail="Navigation and topic coverage" />
          </div>
        </section>

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

        {/* Priority scan + coverage map */}
        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Priority scan
                </p>
                <h2 className="mt-1.5 text-xl font-semibold text-[var(--foreground)]">
                  Full top-event stack
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  These are the complete lead cards, not the trimmed public preview.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{topEvents.length} {topEvents.length === 1 ? "event" : "events"}</Badge>
                {isLiveBriefing && !allRead ? (
                  <form action={markAllReadAction}>
                    <input type="hidden" name="briefingId" value={data.briefing.id} />
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
              {topEvents.map((event) => {
                return (
                  <StoryCard key={event.id} item={event} />
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
      </div>
    </AppShell>
  );
}

function MetricPanel({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </Panel>
  );
}
