import { createTopicAction } from "@/app/actions";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDashboardData, getViewerAccount } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatBriefingDate } from "@/lib/utils";

export default async function TopicsPage() {
  const data = await getDashboardData();
  const viewer = await getViewerAccount();

  return (
    <AppShell currentPath="/topics" mode={data.mode} account={viewer}>
      <div className="space-y-6 py-2">
        <PageHeader
          eyebrow="Topic management"
          title="Choose the areas that deserve attention"
          description="Topics give the product structure. Each source can be attached to a topic so the daily briefing stays organized and easy to scan."
          aside={
            <Link href="#add-topic" className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(19,26,34,0.16)]">
              Add topic
            </Link>
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {data.topics.map((topic) => (
            <Panel key={topic.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">{topic.name}</h2>
                    <Badge>Topic</Badge>
                    <Badge>{data.sources.filter((source) => source.topicId === topic.id).length} sources</Badge>
                    <Badge>
                      {data.briefing.items.filter((item) => item.topicId === topic.id).length} stories today
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{topic.description}</p>
                  <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
                    Last updated {formatBriefingDate(data.briefing.briefingDate)}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Accent color
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: topic.color }} />
                  <span className="text-xs font-medium text-[var(--muted)]">{topic.color}</span>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <Panel id="add-topic" className="p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Add a new topic</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {isSupabaseConfigured
              ? "Use broad categories so your daily briefing stays concise and easy to scan."
              : "Connect Supabase in Settings to save new topics. Until then, demo topics are shown."}
          </p>
          <form action={createTopicAction} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Topic name</span>
              <input
                name="name"
                placeholder="AI"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Color</span>
              <input
                name="color"
                type="color"
                defaultValue="#1F4F46"
                className="h-[52px] w-full rounded-2xl border border-[var(--line)] bg-white/70 px-2 py-2"
                disabled={!isSupabaseConfigured}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Description</span>
              <textarea
                name="description"
                rows={4}
                placeholder="Model launches, enterprise adoption, regulation, and infrastructure shifts."
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
              />
            </label>
            <SubmitButton
              idleLabel="Save topic"
              pendingLabel="Saving topic..."
              className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white"
              disabled={!isSupabaseConfigured}
            />
          </form>
        </Panel>

        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">How topic setup works</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              "Create broad themes like AI, finance, politics, or product.",
              "Attach feeds to the right topic so the daily briefing stays structured.",
              "Keep the number of topics tight so the product remains fast to scan.",
            ].map((point) => (
              <div key={point} className="rounded-[22px] border border-[var(--line)] bg-white/60 p-4 text-sm leading-7 text-[var(--foreground)]">
                {point}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
