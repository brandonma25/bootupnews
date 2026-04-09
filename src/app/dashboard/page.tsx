import Link from "next/link";

import { generateBriefingAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StoryCard } from "@/components/story-card";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDashboardData, getViewerAccount } from "@/lib/data";
import { cn, formatBriefingDate } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; topic?: string; view?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData();
  const viewer = await getViewerAccount();
  const generated = params.generated === "1";
  const activeTopicId = params.topic;
  const unreadOnly = params.view === "unread";
  const visibleItems = data.briefing.items.filter((item) => {
    const topicMatch = !activeTopicId || item.topicId === activeTopicId;
    const readMatch = !unreadOnly || !item.read;
    return topicMatch && readMatch;
  });
  const topStories = visibleItems.filter((item) => item.priority === "top");
  const grouped = data.topics.map((topic) => ({
    topic,
    items: visibleItems.filter((item) => item.topicId === topic.id && item.priority !== "top"),
    totalCount: visibleItems.filter((item) => item.topicId === topic.id).length,
  }));
  const activeTopic = data.topics.find((topic) => topic.id === activeTopicId);

  return (
    <AppShell currentPath="/dashboard" mode={data.mode} account={viewer}>
      <div className="space-y-6 py-2">
        {generated ? (
          <Panel className="border border-[rgba(31,79,70,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,249,247,0.92))] p-4 text-sm text-[var(--foreground)]">
            Your briefing was refreshed successfully.
          </Panel>
        ) : null}
        <PageHeader
          eyebrow={formatBriefingDate(data.briefing.briefingDate)}
          title={data.briefing.title}
          description={data.briefing.intro}
          aside={
            <div className="flex flex-col items-stretch gap-3">
              <div className="rounded-[26px] border border-[var(--line)] bg-white/70 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Reading window
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {data.briefing.readingWindow}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Estimated from story length and summary density for a fast executive scan.
                </p>
              </div>
              <form action={generateBriefingAction}>
                <SubmitButton
                  className="w-full"
                  idleLabel="Generate fresh briefing"
                  pendingLabel="Generating briefing..."
                />
              </form>
            </div>
          }
        />

        <Panel className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                View controls
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                {activeTopic
                  ? `Filtering to ${activeTopic.name}${unreadOnly ? " and unread stories" : ""}.`
                  : unreadOnly
                    ? "Showing unread stories across all topics."
                    : "Showing the full briefing across all topics."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={unreadOnly ? "/dashboard?view=unread" : "/dashboard"}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium",
                  !activeTopicId
                    ? "border-[rgba(31,79,70,0.16)] bg-[var(--foreground)] text-white"
                    : "border-[var(--line)] bg-white/70 text-[var(--foreground)]",
                )}
              >
                All topics
              </Link>
              {data.topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/dashboard?topic=${topic.id}${unreadOnly ? "&view=unread" : ""}`}
                  className={cn(
                    "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium",
                    activeTopicId === topic.id
                      ? "border-[rgba(31,79,70,0.16)] bg-[var(--foreground)] text-white"
                      : "border-[var(--line)] bg-white/70 text-[var(--foreground)]",
                  )}
                >
                  {topic.name}
                </Link>
              ))}
              <Link
                href={
                  unreadOnly
                    ? activeTopicId
                      ? `/dashboard?topic=${activeTopicId}`
                      : "/dashboard"
                    : activeTopicId
                      ? `/dashboard?topic=${activeTopicId}&view=unread`
                      : "/dashboard?view=unread"
                }
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium",
                  unreadOnly
                    ? "border-[rgba(31,79,70,0.16)] bg-[var(--foreground)] text-white"
                    : "border-[var(--line)] bg-white/70 text-[var(--foreground)]",
                )}
              >
                Unread only
              </Link>
            </div>
          </div>
        </Panel>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Top 5 stories today
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Priority scan
                </h2>
              </div>
              <Badge>{topStories.length} items</Badge>
            </div>
            {topStories.length ? (
              <div className="mt-6 grid gap-4">
                {topStories.map((story) => (
                  <div
                    key={story.id}
                    className="rounded-[24px] border border-[var(--line)] bg-white/60 p-5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge>{story.topicName}</Badge>
                      <Badge className="text-[var(--accent)]">Top</Badge>
                      {story.importanceLabel ? <Badge>{story.importanceLabel}</Badge> : null}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                      {story.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      {story.whyItMatters}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel)]/55 p-5 text-sm leading-7 text-[var(--foreground)]">
                No priority stories match the current filter. Clear the filters to view the full briefing.
              </div>
            )}
          </Panel>

          <Panel className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Coverage overview
            </p>
            <div className="mt-6 space-y-4">
              {grouped.map(({ topic, items, totalCount }) => (
                <Link
                  key={topic.id}
                  href={`#topic-section-${topic.id}`}
                  className="block rounded-[22px] border border-[var(--line)] bg-white/60 p-4 transition-colors hover:bg-white/75"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--foreground)]">
                        {topic.name}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        {topic.description}
                      </p>
                    </div>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: topic.color }}
                    />
                  </div>
                  <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
                    {totalCount} {totalCount === 1 ? "story" : "stories"} in today&apos;s briefing
                  </p>
                  {items.length === 0 && totalCount > 0 ? (
                    <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                      The top-priority item for this topic is already covered in the priority scan above.
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        <section className="space-y-6">
          {grouped.map(({ topic, items, totalCount }) =>
            totalCount ? (
              <div key={topic.id} id={`topic-section-${topic.id}`} className="space-y-4 scroll-mt-24">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Topic section
                    </p>
                    <h2 className="display-font mt-2 text-3xl text-[var(--foreground)]">
                      {topic.name}
                    </h2>
                  </div>
                  <p className="max-w-xl text-right text-sm leading-7 text-[var(--muted)]">
                    {topic.description}
                  </p>
                </div>
                {items.length ? (
                  <div className="grid gap-4">
                    {items.map((item) => (
                      <StoryCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <Panel className="p-5 text-sm leading-7 text-[var(--foreground)]">
                    The top-ranked story for this topic is already featured in the priority scan above.
                  </Panel>
                )}
              </div>
            ) : null,
          )}
        </section>
      </div>
    </AppShell>
  );
}
