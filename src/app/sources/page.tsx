import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Info, Rss } from "lucide-react";

import { createSourceAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getDashboardPageState } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { recommendedSources } from "@/lib/source-catalog";

export const metadata: Metadata = {
  title: "Sources — Daily Intelligence",
};

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; demo?: string }>;
}) {
  const params = await searchParams;
  const { data, viewer } = await getDashboardPageState("/sources");

  const activeSources = data.sources.filter((s) => s.status === "active");
  const pausedSources = data.sources.filter((s) => s.status === "paused");
  const topicOptions =
    data.topics.length > 0 ? data.topics : [{ id: "__auto__", name: "General (auto-create)" }];

  return (
    <AppShell currentPath="/sources" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow="Source management"
          title="Track the feeds that matter"
          description="Connect RSS feeds to your topics to power live daily briefings. Start with the curated starter set or add your own."
        />

        {params.saved === "1" ? (
          <div className="rounded-[20px] border border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.06)] px-5 py-4 text-sm font-medium text-[var(--accent)]">
            Source saved successfully.
          </div>
        ) : null}
        {params.demo === "1" ? (
          <div className="rounded-[20px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm text-[var(--foreground)]">
            Connect Supabase in{" "}
            <Link href="/settings" className="font-semibold underline underline-offset-2">
              Settings
            </Link>{" "}
            to save sources.
          </div>
        ) : null}
        {isSupabaseConfigured && !viewer ? (
          <div className="rounded-[20px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm text-[var(--foreground)]">
            Sign in from{" "}
            <Link href="/?auth=1#email-access" className="font-semibold underline underline-offset-2">
              the home page
            </Link>{" "}
            before creating sources. Source saves require an authenticated session.
          </div>
        ) : null}

        {/* Your saved sources */}
        {data.sources.length > 0 ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Your saved sources
            </p>
            <div className="mb-3">
              <FeaturePlaceholder
                icon={Rss}
                title="Source editing and pause controls"
                description="Source pause or resume actions, feed editing, and source health controls are still in development."
                note="You can review current sources and add new ones today, but advanced source management stays in an honest placeholder state until the backend exists."
              />
            </div>
            <div className="grid gap-3">
              {activeSources.map((source) => (
                <Panel key={source.id} className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-[var(--foreground)]">
                          {source.name}
                        </h2>
                        <Badge>{source.topicName ?? "Unassigned"}</Badge>
                        <Badge className="text-[var(--accent)]">Active</Badge>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{source.feedUrl}</p>
                    </div>
                    {source.homepageUrl ? (
                      <a
                        href={source.homepageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-xs text-[var(--foreground)] transition-colors hover:bg-white"
                      >
                        Visit
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </Panel>
              ))}
              {pausedSources.map((source) => (
                <Panel key={source.id} className="p-4 opacity-60">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-[var(--foreground)]">
                          {source.name}
                        </h2>
                        <Badge>{source.topicName ?? "Unassigned"}</Badge>
                        <Badge>Paused</Badge>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{source.feedUrl}</p>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        ) : null}

        {/* Add custom source form */}
        <Panel className="p-5">
          <div className="mb-5 border-b border-[var(--line)] pb-4">
            <div className="flex items-center gap-2">
              <Rss className="h-4 w-4 text-[var(--muted)]" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Add an RSS source</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {isSupabaseConfigured
                ? "Paste any RSS feed URL. The source will be assigned to the topic you choose and included in your next briefing."
                : "The form is available for setup, but saving still requires Supabase credentials to be loaded."}
            </p>
          </div>
          {viewer ? (
            <form action={createSourceAction} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">Source name</span>
                <input
                  name="name"
                  placeholder="Financial Times"
                  required
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]/60 focus:border-[var(--foreground)] disabled:opacity-50"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">Topic</span>
                <select
                  name="topicId"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none disabled:opacity-50"
                  defaultValue={topicOptions[0]?.id}
                >
                  {topicOptions.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
                {data.topics.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">
                    Your first source will auto-create a starter topic so ingestion can begin immediately.
                  </p>
                ) : null}
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  RSS feed URL
                  <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                    e.g. https://example.com/feed.xml or /rss
                  </span>
                </span>
                <input
                  name="feedUrl"
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  required
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]/60 focus:border-[var(--foreground)] disabled:opacity-50"
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Homepage URL
                  <span className="ml-2 text-xs font-normal text-[var(--muted)]">optional</span>
                </span>
                <input
                  name="homepageUrl"
                  type="url"
                  placeholder="https://example.com"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]/60 focus:border-[var(--foreground)] disabled:opacity-50"
                />
              </label>
              <div className="md:col-span-2">
                <Button type="submit" className="px-6">
                  Save source
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-[18px] border border-[var(--line)] bg-white/60 px-4 py-4 text-sm leading-7 text-[var(--foreground)]">
              Source creation is available after sign-in so the source can be saved to your account.
            </div>
          )}
        </Panel>

        {/* Source catalog — clearly labelled as optional import support */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Source catalog
            </p>
            <span className="rounded-full border border-[var(--line)] bg-white/60 px-2 py-0.5 text-xs text-[var(--muted)]">
              {recommendedSources.filter((s) => s.importStatus === "ready").length} importable
            </span>
          </div>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Catalog entries are optional imports, not active default ingestion. Sources marked{" "}
            <span className="font-medium text-[var(--foreground)]">Manual setup</span> need a fresh
            endpoint check or credentials before import.
          </p>
          <div className="grid gap-4 xl:grid-cols-2">
            {recommendedSources.map((source) => {
              const isManual = source.importStatus === "manual";
              const isImportable = source.importStatus === "ready" && Boolean(source.feedUrl);
              return (
                <Panel
                  key={source.id}
                  className={`p-5 ${isManual ? "opacity-70" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {source.name}
                    </h3>
                    <Badge>{source.topicLabel}</Badge>
                    <Badge>{source.cadence}</Badge>
                    <Badge>{source.lifecycleStatus.replace("_", " ")}</Badge>
                    <Badge className={!isManual ? "text-[var(--accent)]" : ""}>
                      {isManual ? "Manual setup" : "Importable"}
                    </Badge>
                    <Badge>
                      {source.validationStatus.replace("_", " ")}
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {source.description}
                  </p>

                  {source.note ? (
                    <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--warm)]/60 px-3 py-2">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                      <p className="text-xs leading-5 text-[var(--muted)]">{source.note}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <a
                      href={source.homepageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground)] hover:underline"
                    >
                      Visit source
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    {isImportable && viewer ? (
                      <form action={createSourceAction} className="flex items-end gap-3">
                        <input type="hidden" name="name" value={source.name} />
                        <input type="hidden" name="feedUrl" value={source.feedUrl} />
                        <input type="hidden" name="homepageUrl" value={source.homepageUrl} />
                        <select
                          name="topicId"
                          className="rounded-2xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none disabled:opacity-40"
                          defaultValue={
                            data.topics.find((t) => t.name === source.topicLabel)?.id ??
                            topicOptions[0]?.id
                          }
                        >
                          {topicOptions.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="submit"
                          variant="secondary"
                          className="shrink-0 text-sm"
                        >
                          Import
                        </Button>
                      </form>
                    ) : isImportable ? (
                      <Link
                        href="/?auth=1#email-access"
                        className="text-sm font-medium text-[var(--foreground)] underline underline-offset-2"
                      >
                        Sign in to import
                      </Link>
                    ) : null}
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
