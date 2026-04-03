import { createTopicAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { getDashboardData } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function TopicsPage() {
  const data = await getDashboardData();

  return (
    <AppShell currentPath="/topics" mode={data.mode}>
      <div className="space-y-6 py-2">
        <PageHeader
          eyebrow="Topic management"
          title="Choose the areas that deserve attention"
          description="Topics give the product structure. Each source can be attached to a topic so the daily briefing stays organized and easy to scan."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {data.topics.map((topic) => (
            <Panel key={topic.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">{topic.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{topic.description}</p>
                </div>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: topic.color }} />
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="p-6">
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
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!isSupabaseConfigured}
            >
              Save topic
            </button>
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
