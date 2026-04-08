import { createSourceAction } from "@/app/actions";
import { ExternalLink } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDashboardData } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { recommendedSources } from "@/lib/source-catalog";

export default async function SourcesPage() {
  const data = await getDashboardData();

  return (
    <AppShell currentPath="/sources" mode={data.mode}>
      <div className="space-y-6 py-2">
        <PageHeader
          eyebrow="Source management"
          title="Track the feeds that matter"
          description="Start with RSS for the MVP. This page now includes a curated starter set of live news and newsletter feeds so you can begin populating real daily briefings quickly."
        />

        <Panel className="p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Recommended live sources</h2>
            <p className="text-sm leading-7 text-[var(--muted)]">
              These are ready-to-import feeds from established publications and newsletters. Pick a topic and save each source with one click.
            </p>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {recommendedSources.map((source) => (
              <Panel key={source.id} className="border border-[var(--line)] bg-white/70 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{source.name}</h3>
                  <Badge>{source.topicLabel}</Badge>
                  <Badge>{source.sourceType}</Badge>
                  <Badge>{source.cadence}</Badge>
                  <Badge className={source.importStatus === "ready" ? "text-[var(--accent)]" : ""}>
                    {source.importStatus === "ready" ? "RSS ready" : "Manual setup"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{source.description}</p>
                <div className="mt-4 space-y-1 text-xs leading-6 text-[var(--muted)]">
                  <p>{source.homepageUrl}</p>
                  {source.feedUrl ? <p>{source.feedUrl}</p> : null}
                </div>
                {source.note ? (
                  <p className="mt-3 text-xs leading-6 text-[var(--muted)]">{source.note}</p>
                ) : null}

                {source.feedUrl ? (
                  <form action={createSourceAction} className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <input type="hidden" name="name" value={source.name} />
                    <input type="hidden" name="feedUrl" value={source.feedUrl} />
                    <input type="hidden" name="homepageUrl" value={source.homepageUrl} />
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">Save under topic</span>
                      <select
                        name="topicId"
                        className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                        disabled={!isSupabaseConfigured || data.topics.length === 0}
                        defaultValue={data.topics.find((topic) => topic.name === source.topicLabel)?.id ?? data.topics[0]?.id}
                      >
                        {data.topics.map((topic) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="inline-flex items-end justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={!isSupabaseConfigured || data.topics.length === 0}
                    >
                      Import source
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)]/60 px-4 py-3 text-sm text-[var(--muted)]">
                    Add a feed URL later if you want this source to participate in automated briefing generation.
                  </div>
                )}

                <a
                  href={source.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--foreground)]"
                >
                  Visit source
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Panel>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4">
          {data.sources.map((source) => (
            <Panel key={source.id} className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">{source.name}</h2>
                    <Badge>{source.topicName ?? "Unassigned"}</Badge>
                    <Badge className={source.status === "active" ? "text-[var(--accent)]" : ""}>
                      {source.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-[var(--muted)]">
                    <p>{source.feedUrl}</p>
                    {source.homepageUrl ? <p>{source.homepageUrl}</p> : null}
                  </div>
                </div>
                {source.homepageUrl ? (
                  <a
                    href={source.homepageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm text-[var(--foreground)]"
                  >
                    Visit source
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Add an RSS source</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {isSupabaseConfigured
              ? "Use this for any additional feed or newsletter RSS URL you want to track beyond the starter library."
              : "Connect Supabase in Settings to save sources. Until then, demo sources are shown."}
          </p>
          <form action={createSourceAction} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Source name</span>
              <input
                name="name"
                placeholder="Financial Times"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Topic</span>
              <select
                name="topicId"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
                defaultValue={data.topics[0]?.id}
              >
                {data.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[var(--foreground)]">RSS feed URL</span>
              <input
                name="feedUrl"
                placeholder="https://example.com/feed.xml"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Homepage URL</span>
              <input
                name="homepageUrl"
                placeholder="https://example.com"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
              />
            </label>
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!isSupabaseConfigured}
            >
              Save source
            </button>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
