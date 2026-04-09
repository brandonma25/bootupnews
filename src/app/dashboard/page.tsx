import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CheckCheck, RefreshCw } from "lucide-react";

import { generateBriefingAction, markAllReadAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { StoryCard } from "@/components/story-card";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getDashboardData, getViewerAccount } from "@/lib/data";
import { isAiConfigured } from "@/lib/env";
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

  // Deduplicate: top-priority items shown in priority scan, not repeated in topic sections
  const topStories = data.briefing.items.filter((item) => item.priority === "top");
  const topStoryIds = new Set(topStories.map((item) => item.id));
  const grouped = data.topics.map((topic) => ({
    topic,
    // Topic sections only show items NOT already in the priority scan
    items: data.briefing.items.filter(
      (item) => item.topicId === topic.id && !topStoryIds.has(item.id),
    ),
  }));

  const allRead = data.briefing.items.length > 0 && data.briefing.items.every((item) => item.read);
  const isLiveBriefing = !data.briefing.id.startsWith("generated-");

  return (
    <AppShell currentPath="/dashboard" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow={formatBriefingDate(data.briefing.briefingDate)}
          title={data.briefing.title}
          description={data.briefing.intro}
          aside={
            <div className="flex flex-col items-stretch gap-2 min-w-[168px]">
              <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Reading window
                </p>
                <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  {data.briefing.readingWindow}
                </p>
              </div>
              {isAiConfigured ? (
                <form action={generateBriefingAction}>
                  <Button className="w-full gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh briefing
                  </Button>
                </form>
              ) : (
                <Link href="/settings">
                  <Button variant="secondary" className="w-full gap-2 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Connect AI key
                  </Button>
                </Link>
              )}
            </div>
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
            All stories marked as read.
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
                  Top stories today
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{topStories.length} items</Badge>
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
              {topStories.map((story) => (
                <div
                  key={story.id}
                  className="rounded-[20px] border border-[var(--line)] bg-white/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{story.topicName}</Badge>
                    <Badge className="text-[var(--accent)]">Top story</Badge>
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug text-[var(--foreground)]">
                    {story.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)] line-clamp-2">
                    {story.whatHappened}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Coverage map — sticky on desktop */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            <Panel className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Coverage map
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Stories by topic in today&apos;s briefing
              </p>
              <div className="mt-4 space-y-3">
                {grouped.map(({ topic, items }) => {
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
                      <Badge>{total} {total === 1 ? "story" : "stories"}</Badge>
                    </a>
                  );
                })}
              </div>
            </Panel>
          </div>
        </section>

        {/* Topic sections — deduplicated */}
        <section className="space-y-6">
          {grouped.map(({ topic, items }) =>
            items.length ? (
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
                <div className="grid gap-4">
                  {items.map((item) => (
                    <StoryCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </section>
      </div>
    </AppShell>
  );
}
