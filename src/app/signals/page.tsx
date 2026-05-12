import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { MvpMeasurementTracker } from "@/components/mvp-measurement/MvpMeasurementTracker";
import { SignalCard } from "@/components/signals/SignalCard";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  getPublicSignalsPageState,
  type EditorialSignalPost,
} from "@/lib/signals-editorial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Boot Up — All signals",
};

export default async function PublicSignalsPage() {
  const state = await getPublicSignalsPageState();
  const posts = state.kind === "published" ? state.posts : [];
  const briefingDate = posts[0]?.briefingDate ?? null;
  const groupedPosts = groupPostsByDate(posts);

  return (
    <AppShell currentPath="/signals" mode="public" account={null}>
      <main className="mx-auto w-full max-w-[var(--bu-container-narrow)] px-[var(--bu-space-2)] py-[var(--bu-space-7)] md:px-0">
        <MvpMeasurementTracker
          pageView={{
            eventName: "signals_page_view",
            route: "/signals",
            surface: "signals_index",
            briefingDate,
            metadata: {
              visibleSignalCount: posts.length,
              coreSignalCount: posts.filter(isCorePublicSignal).length,
              contextSignalCount: posts.filter(isContextPublicSignal).length,
              rendersCoreAndContext: posts.filter(isCorePublicSignal).length === 5 && posts.filter(isContextPublicSignal).length === 2,
              stateKind: state.kind,
            },
          }}
        />

        <header className="mb-[var(--bu-space-6)] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">All signals</p>
            <h1 className="mt-2 text-[var(--bu-size-page-title)] font-medium leading-tight text-[var(--bu-text-primary)]">
              All signals
            </h1>
          </div>
          <Button asChild variant="secondary">
            <Link href="/">Back to today</Link>
          </Button>
        </header>

        {state.kind === "published" ? (
          <div className="space-y-[var(--bu-space-7)]">
            {groupedPosts.map((group) => (
              <section key={group.date} className="space-y-[var(--bu-space-3)]">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--bu-border-subtle)] pb-[var(--bu-space-2)]">
                  <h2 className="text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-primary)]">
                    {formatSignalsDate(group.date)}
                  </h2>
                  <p className="text-[var(--bu-size-meta)] font-normal text-[var(--bu-text-tertiary)]">
                    {group.posts.length} {group.posts.length === 1 ? "signal" : "signals"}
                  </p>
                </div>
                <div className="grid gap-[var(--bu-space-2)]">
                  {group.posts.map((post) => (
                    <SignalCard
                      key={post.id}
                      signal={post}
                      compact
                      rank={getPublicSignalDisplayRank(post)}
                      tier={isContextPublicSignal(post) ? "context" : "core"}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : state.kind === "temporarily_unavailable" ? (
          <Panel className="p-6">
            <p className="text-base font-medium text-[var(--bu-text-primary)]">
              Published briefing is temporarily unavailable
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--bu-text-secondary)]">
              The reviewed briefing is being kept offline until it can be read safely. Check back shortly.
            </p>
          </Panel>
        ) : (
          <Panel className="p-6">
            <p className="text-base font-medium text-[var(--bu-text-primary)]">
              Nothing here yet
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--bu-text-secondary)]">
              This page will list published signals after the current slate is approved.
            </p>
          </Panel>
        )}
      </main>
    </AppShell>
  );
}

function groupPostsByDate(posts: EditorialSignalPost[]) {
  const groups = new Map<string, EditorialSignalPost[]>();

  for (const post of posts) {
    const date = post.briefingDate ?? "unknown";
    groups.set(date, [...(groups.get(date) ?? []), post]);
  }

  return Array.from(groups.entries()).map(([date, groupPosts]) => ({
    date,
    posts: groupPosts.slice().sort((left, right) => getPublicSignalDisplayRank(left) - getPublicSignalDisplayRank(right)),
  }));
}

function formatSignalsDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function getPublicSignalDisplayRank(post: EditorialSignalPost) {
  return post.finalSlateRank ?? post.rank;
}

function isCorePublicSignal(post: EditorialSignalPost) {
  if (post.finalSlateTier) {
    return post.finalSlateTier === "core";
  }

  const rank = getPublicSignalDisplayRank(post);
  return rank >= 1 && rank <= 5;
}

function isContextPublicSignal(post: EditorialSignalPost) {
  if (post.finalSlateTier) {
    return post.finalSlateTier === "context";
  }

  const rank = getPublicSignalDisplayRank(post);
  return rank >= 6 && rank <= 7;
}
