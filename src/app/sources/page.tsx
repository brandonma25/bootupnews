import { createSourceAction } from "@/app/actions";
import { ExternalLink } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDashboardData, getViewerAccount } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { recommendedSources } from "@/lib/source-catalog";

export default async function SourcesPage() {
  const data = await getDashboardData();
  const viewer = await getViewerAccount();
  const readySources = recommendedSources.filter((source) => source.importStatus === "ready");
  const manualSources = recommendedSources.filter((source) => source.importStatus !== "ready");

  return (
    <AppShell currentPath="/sources" mode={data.mode} account={viewer}>
      <div className="space-y-6 py-2">
        <PageHeader
          eyebrow="Source management"
          title="Track the feeds that matter"
          description="Start with RSS for the MVP. This page now separates your current source stack from the wider library so it is obvious what is already active versus what still needs setup."
          aside={
            <div className="rounded-[22px] border border-[var(--line)] bg-white/75 px-4 py-3 text-sm text-[var(--foreground)]">
              {data.sources.length} saved source{data.sources.length === 1 ? "" : "s"}
            </div>
          }
        />

        <Panel className="p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Your saved sources</h2>
            <p className="text-sm leading-7 text-[var(--muted)]">
              These are the feeds already attached to your topics and eligible for briefing generation.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {data.sources.length ? (
              data.sources.map((source) => (
                <Panel
                  key={source.id}
                  className="border border-[rgba(31,79,70,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,249,247,0.92))] p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[var(--foreground)]">{source.name}</h2>
                        <Badge>{source.topicName ?? "Unassigned"}</Badge>
                        <Badge className="border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.10)] text-[var(--accent)]">
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
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel)]/55 p-5 text-sm leading-7 text-[var(--foreground)]">
                No saved sources yet. Import one from the starter library below or add a custom RSS feed.
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Source library</h2>
            <p className="text-sm leading-7 text-[var(--muted)]">
              RSS-ready feeds can be imported immediately. Manual-setup publishers are listed separately so they do not look interchangeable.
            </p>
          </div>

          <div className="mt-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Ready to import
                  </p>
                  <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                    Working feed URLs are already attached to these sources.
                  </p>
                </div>
                <Badge className="border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.10)] text-[var(--accent)]">
                  RSS ready
                </Badge>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {readySources.map((source) => (
                  <SourceLibraryCard key={source.id} source={source} topicIds={data.topics.map((topic) => topic.id)} topicNames={data.topics.map((topic) => topic.name)} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[22px] border border-[rgba(148,72,53,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(250,245,241,0.94))] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border-[rgba(148,72,53,0.18)] bg-[rgba(148,72,53,0.08)] text-[#944835]">
                    Manual setup
                  </Badge>
                  <p className="text-sm leading-7 text-[var(--foreground)]">
                    These publishers still need a verified feed URL or a custom ingestion path before they can join the automated briefing pipeline.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {manualSources.map((source) => (
                  <SourceLibraryCard key={source.id} source={source} topicIds={data.topics.map((topic) => topic.id)} topicNames={data.topics.map((topic) => topic.name)} manual />
                ))}
              </div>
            </div>
          </div>
        </Panel>

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
                required
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
                type="url"
                placeholder="https://example.com/feed.xml"
                required
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
              />
              <p className="text-xs leading-6 text-[var(--muted)]">
                Paste the direct feed URL, not just the publication homepage.
              </p>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Homepage URL</span>
              <input
                name="homepageUrl"
                type="url"
                placeholder="https://example.com"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                disabled={!isSupabaseConfigured}
              />
              <p className="text-xs leading-6 text-[var(--muted)]">
                After saving, the source will appear in your active list above and become eligible for future briefings.
              </p>
            </label>
            <SubmitButton idleLabel="Save source" pendingLabel="Saving source..." disabled={!isSupabaseConfigured} />
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}

function SourceLibraryCard({
  source,
  topicIds,
  topicNames,
  manual = false,
}: {
  source: (typeof recommendedSources)[number];
  topicIds: string[];
  topicNames: string[];
  manual?: boolean;
}) {
  return (
    <Panel
      className={`p-5 ${manual ? "border border-[rgba(148,72,53,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(250,245,241,0.94))]" : "border border-[var(--line)] bg-white/70"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{source.name}</h3>
        <Badge>{source.topicLabel}</Badge>
        <Badge>{source.sourceType}</Badge>
        <Badge>{source.cadence}</Badge>
        <Badge
          className={
            source.importStatus === "ready"
              ? "border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.10)] text-[var(--accent)]"
              : "border-[rgba(148,72,53,0.18)] bg-[rgba(148,72,53,0.08)] text-[#944835]"
          }
        >
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
              disabled={!isSupabaseConfigured || topicIds.length === 0}
              defaultValue={topicIds[topicNames.findIndex((name) => name === source.topicLabel)] ?? topicIds[0]}
            >
              {topicIds.map((topicId, index) => (
                <option key={topicId} value={topicId}>
                  {topicNames[index]}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton
            className="self-end"
            idleLabel="Import source"
            pendingLabel="Importing..."
            disabled={!isSupabaseConfigured || topicIds.length === 0}
          />
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
  );
}
