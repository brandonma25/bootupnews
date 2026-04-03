import { generateBriefingAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { StoryCard } from "@/components/story-card";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getDashboardData } from "@/lib/data";
import { formatBriefingDate } from "@/lib/utils";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const topStories = data.briefing.items.filter((item) => item.priority === "top");
  const grouped = data.topics.map((topic) => ({
    topic,
    items: data.briefing.items.filter((item) => item.topicId === topic.id),
  }));

  return (
    <AppShell currentPath="/dashboard" mode={data.mode}>
      <div className="space-y-6 py-2">
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
              </div>
              <form action={generateBriefingAction}>
                <Button className="w-full">Generate fresh briefing</Button>
              </form>
            </div>
          }
        />

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
            <div className="mt-6 grid gap-4">
              {topStories.map((story) => (
                <div
                  key={story.id}
                  className="rounded-[24px] border border-[var(--line)] bg-white/60 p-5"
                >
                  <div className="flex items-center gap-2">
                    <Badge>{story.topicName}</Badge>
                    <Badge className="text-[var(--accent)]">Top story</Badge>
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
          </Panel>

          <Panel className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Coverage map
            </p>
            <div className="mt-6 space-y-4">
              {grouped.map(({ topic, items }) => (
                <div key={topic.id} className="rounded-[22px] border border-[var(--line)] bg-white/60 p-4">
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
                    {items.length} stor{items.length === 1 ? "y" : "ies"} in today&apos;s briefing
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="space-y-6">
          {grouped.map(({ topic, items }) =>
            items.length ? (
              <div key={topic.id} className="space-y-4">
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
