import type { Metadata } from "next";
import { CheckCheck, ExternalLink } from "lucide-react";

import { markAllReadAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardStatePanel } from "@/components/dashboard/dashboard-state-panel";
import { StoryCard } from "@/components/story-card";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDashboardData, getViewerAccount } from "@/lib/data";
import { getDashboardViewState } from "@/lib/dashboard-state";
import { isAiConfigured } from "@/lib/env";
import { formatBriefingDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Today's Briefing — Daily Intelligence",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; allread?: string; error?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData();
  const viewer = await getViewerAccount();
  const dashboardState = getDashboardViewState(data);

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

  const allRead = data.briefing.items.length > 0 && data.briefing.items.every((item) => item.read);
  const isLiveBriefing = !data.briefing.id.startsWith("generated-");
  const activeSourceCount = data.sources.filter((source) => source.status === "active").length;
  const emptyStateMeta = [
    `${data.topics.length} ${data.topics.length === 1 ? "topic" : "topics"} configured`,
    `${activeSourceCount} active ${activeSourceCount === 1 ? "source" : "sources"}`,
    "Auto-checking for briefing-ready content",
  ];

  return (
    <AppShell currentPath="/dashboard" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        <DashboardHeader
          eyebrow={formatBriefingDate(data.briefing.briefingDate)}
          lastUpdatedAt={data.lastUpdatedAt}
          state={dashboardState}
          briefingIntro={data.briefing.intro}
          readingWindow={data.briefing.readingWindow}
          isAiConfigured={isAiConfigured}
        />

        {params.error === "1" ? (
          <div className="rounded-[22px] border border-[rgba(164,53,42,0.18)] bg-[rgba(164,53,42,0.06)] px-5 py-4 text-sm font-medium text-[rgb(134,49,39)]">
            We hit a snag while refreshing your dashboard. Try refresh again in a moment.
          </div>
        ) : null}
        {params.generated === "1" ? (
          <div className="rounded-[22px] border border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.06)] px-5 py-4 text-sm font-medium text-[var(--accent)]">
            Briefing refreshed successfully.
          </div>
        ) : null}
        {params.allread === "1" ? (
          <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm font-medium text-[var(--foreground)]">
            All events marked as read.
          </div>
        ) : null}

        {dashboardState === "empty" ? (
          <DashboardStatePanel
            title="Setting up your feed (10–20 seconds)…"
            description="Your feed is still being prepared. We’ll keep checking for usable dashboard content so this page can turn into Today’s Briefing as soon as it is ready."
            tone="accent"
            meta={emptyStateMeta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[rgba(31,79,70,0.12)] bg-white/80 px-3 py-1.5"
              >
                {item}
              </span>
            ))}
          />
        ) : (
          <>
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
                      const total = data.briefing.items.filter((item) => item.topicId === topic.id).length;
                      return (
                        <a
                          key={topic.id}
                          href={`#topic-${topic.id}`}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-white/60 px-4 py-3 transition-colors hover:bg-white"
                        >
                          <div className="flex min-w-0 items-center gap-3">
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
          </>
        )}
      </div>
    </AppShell>
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
