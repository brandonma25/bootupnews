import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { createTopicAction, deleteTopicAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getDashboardData, getViewerAccount } from "@/lib/data";
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
  const data = await getDashboardData();
  const viewer = await getViewerAccount();

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
          <div className="rounded-[20px] border border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.06)] px-5 py-4 text-sm font-medium text-[var(--accent)]">
            Topic saved successfully.
          </div>
        ) : null}
        {params.demo === "1" ? (
          <div className="rounded-[20px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm text-[var(--foreground)]">
            Connect Supabase in{" "}
            <Link href="/settings" className="font-semibold underline underline-offset-2">
              Settings
            </Link>{" "}
            to save topics.
          </div>
        ) : null}
        {isSupabaseConfigured && !viewer ? (
          <div className="rounded-[20px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm text-[var(--foreground)]">
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
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Your topics
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.topics.map((topic) => {
                const storyCount = data.briefing.items.filter(
                  (item) => item.topicId === topic.id,
                ).length;
                return (
                  <Panel key={topic.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: topic.color }}
                        />
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-[var(--foreground)]">
                            {topic.name}
                          </h2>
                          <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
                            {topic.description}
                          </p>
                          <p className="mt-2 text-xs text-[var(--muted)]">
                            {storyCount} {storyCount === 1 ? "story" : "stories"} in today&apos;s briefing
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
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white/60 text-[var(--muted)] transition-colors hover:border-[rgba(148,72,53,0.3)] hover:bg-[rgba(148,72,53,0.06)] hover:text-[rgba(148,72,53,0.8)]"
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
          <div className="border-b border-[var(--line)] pb-4 mb-5">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Add a new topic</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {isSupabaseConfigured
                ? "Use broad categories — AI, markets, geopolitics — to keep your briefing scannable."
                : "Topic creation is available here, but saving still depends on Supabase being loaded in the current server process."}
            </p>
          </div>
          {viewer ? (
            <form action={createTopicAction} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Topic name <span className="text-[var(--muted)]">*</span>
                </span>
                <input
                  name="name"
                  placeholder="e.g. AI, Markets, Geopolitics"
                  required
                  minLength={2}
                  maxLength={40}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]/60 focus:border-[var(--foreground)] focus:ring-0 disabled:opacity-50"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Colour <span className="text-[var(--muted)]">*</span>
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
                        className="block h-8 w-8 rounded-full ring-offset-2 ring-offset-[var(--background)] transition-all hover:scale-110 peer-checked:ring-2 peer-checked:ring-[var(--foreground)] peer-disabled:opacity-40"
                        style={{ backgroundColor: color.value }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Description <span className="text-[var(--muted)]">*</span>
                </span>
                <textarea
                  name="description"
                  rows={3}
                  required
                  minLength={10}
                  maxLength={200}
                  placeholder="Describe what this topic covers — e.g. model launches, enterprise adoption, regulatory shifts."
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]/60 focus:border-[var(--foreground)] disabled:opacity-50"
                />
              </label>

              <div className="md:col-span-2">
                <Button type="submit" className="px-6">
                  Save topic
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-[18px] border border-[var(--line)] bg-white/60 px-4 py-4 text-sm leading-7 text-[var(--foreground)]">
              Topic creation is available after sign-in so the topic can be saved to your account.
            </div>
          )}
        </Panel>

        {/* How it works */}
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">How topic setup works</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              "Create broad themes like AI, finance, or politics.",
              "Attach feeds to the right topic so briefings stay structured.",
              "Keep the topic count tight so the product stays fast to scan.",
            ].map((point) => (
              <div
                key={point}
                className="rounded-[18px] border border-[var(--line)] bg-white/60 p-4 text-sm leading-6 text-[var(--foreground)]"
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
