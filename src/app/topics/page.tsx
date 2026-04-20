import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { createTopicAction, deleteTopicAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getDashboardPageState } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Topics — Daily Intelligence",
};

const TOPIC_COLORS = [
  { label: "Forest",   value: "#1f4f46" },
  { label: "Navy",     value: "#2d4a6b" },
  { label: "Amber",    value: "#7a5c1e" },
  { label: "Burgundy", value: "#6b2d2d" },
  { label: "Plum",     value: "#4a2d6b" },
  { label: "Slate",    value: "#3a4a5a" },
  { label: "Rust",     value: "#7a3e28" },
  { label: "Olive",    value: "#4a5a28" },
];

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; demo?: string }>;
}) {
  const params = await searchParams;
  const { data, viewer } = await getDashboardPageState("/topics");

  return (
    <AppShell currentPath="/topics" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow="Topic management"
          title="Choose the areas that deserve attention"
          description="Topics give the product structure. Each source maps to a topic so your briefing stays organised and easy to scan."
        />

        {/* Success / demo banners */}
        {params.saved === "1" ? (
          <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-sm font-medium text-[var(--accent)]">
            Topic saved successfully.
          </div>
        ) : null}
        {params.demo === "1" ? (
          <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-sm text-[var(--text-primary)]">
            Connect Supabase in{" "}
            <Link href="/settings" className="font-semibold underline underline-offset-2">
              Settings
            </Link>{" "}
            to save topics.
          </div>
        ) : null}
        {isSupabaseConfigured && !viewer ? (
          <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-sm text-[var(--text-primary)]">
            Sign in from{" "}
            <Link href="/?auth=1#email-access" className="font-semibold underline underline-offset-2">
              the home page
            </Link>{" "}
            before creating topics. Topic saves require an authenticated session.
          </div>
        ) : null}

        {/* Existing topics */}
        {data.topics.length > 0 ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
              Your topics
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.topics.map((topic) => {
                const eventCount = data.briefing.items.filter(
                  (item) => item.topicId === topic.id,
                ).length;
                return (
                  <Panel key={topic.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-button"
                          style={{ backgroundColor: topic.color }}
                        />
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-[var(--text-primary)]">
                            {topic.name}
                          </h2>
                          <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                            {topic.description}
                          </p>
                          {topic.keywords?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {topic.keywords.map((keyword) => (
                                <span
                                  key={`${topic.id}-${keyword}`}
                                  className="rounded-button border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {topic.excludeKeywords?.length ? (
                            <p className="mt-2 text-xs text-[var(--text-secondary)]">
                              Excluding: {topic.excludeKeywords.join(", ")}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-[var(--text-secondary)]">
                            {eventCount} {eventCount === 1 ? "event" : "events"} in today&apos;s briefing
                          </p>
                        </div>
                      </div>
                      {isSupabaseConfigured && viewer ? (
                        <form action={deleteTopicAction}>
                          <input type="hidden" name="topicId" value={topic.id} />
                          <button
                            type="submit"
                            title="Delete topic"
                            aria-label={`Delete ${topic.name}`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] transition-colors hover:border-[var(--error)] hover:text-[var(--error)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Add new topic */}
        <Panel className="p-5">
          <div className="border-b border-[var(--border)] pb-4 mb-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Add a new topic</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {isSupabaseConfigured
                ? "Use broad categories — AI, markets, geopolitics — to keep your briefing scannable."
                : "Topic creation is available here, but saving still depends on Supabase being loaded in the current server process."}
            </p>
          </div>
          {viewer ? (
            <form action={createTopicAction} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Topic name <span className="text-[var(--text-secondary)]">*</span>
                </span>
                <input
                  name="name"
                  placeholder="e.g. AI, Markets, Geopolitics"
                  required
                  minLength={2}
                  maxLength={40}
                  className="w-full rounded-input border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-secondary)]/60 hover:border-[var(--text-secondary)] focus:border-[var(--text-primary)] disabled:opacity-40"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Colour <span className="text-[var(--text-secondary)]">*</span>
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {TOPIC_COLORS.map((color, index) => (
                    <label key={color.value} title={color.label} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={color.value}
                        defaultChecked={index === 0}
                        required
                        className="sr-only peer"
                      />
                      <span
                        className="block h-8 w-8 rounded-button ring-offset-2 ring-offset-[var(--bg)] transition-all hover:scale-110 peer-checked:ring-2 peer-checked:ring-[var(--text-primary)] peer-disabled:opacity-40"
                        style={{ backgroundColor: color.value }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Description <span className="text-[var(--text-secondary)]">*</span>
                </span>
                <textarea
                  name="description"
                  rows={3}
                  required
                  minLength={10}
                  maxLength={200}
                  placeholder="Describe what this topic covers — e.g. model launches, enterprise adoption, regulatory shifts."
                  className="w-full rounded-input border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-secondary)]/60 hover:border-[var(--text-secondary)] focus:border-[var(--text-primary)] disabled:opacity-40"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Keywords
                </span>
                <input
                  name="keywords"
                  placeholder="AI, chips, Nvidia, data centers"
                  className="w-full rounded-input border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-secondary)]/60 hover:border-[var(--text-secondary)] focus:border-[var(--text-primary)] disabled:opacity-40"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  Separate keywords with commas. If left blank, the topic name will be used.
                </p>
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Exclude keywords
                </span>
                <input
                  name="excludeKeywords"
                  placeholder="sports, gaming"
                  className="w-full rounded-input border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-secondary)]/60 hover:border-[var(--text-secondary)] focus:border-[var(--text-primary)] disabled:opacity-40"
                />
              </label>

              <div className="md:col-span-2">
                <Button type="submit" className="px-6">
                  Save topic
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm leading-7 text-[var(--text-primary)]">
              Topic creation is available after sign-in so the topic can be saved to your account.
            </div>
          )}
        </Panel>

        {/* How it works */}
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">How topic setup works</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              "Create broad themes like AI, finance, or politics.",
              "Attach feeds to the right topic so briefings stay structured.",
              "Keep the topic count tight so the product stays fast to scan.",
            ].map((point) => (
              <div
                key={point}
                className="rounded-card border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-6 text-[var(--text-primary)]"
              >
                {point}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
