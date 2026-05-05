import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { MvpMeasurementTracker } from "@/components/mvp-measurement/MvpMeasurementTracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  getPublicSignalsPageState,
  type EditorialSignalPost,
} from "@/lib/signals-editorial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Published Signals",
};

export default async function PublicSignalsPage() {
  const state = await getPublicSignalsPageState();
  const posts = state.kind === "published" ? state.posts : [];
  const corePosts = posts.filter(isCorePublicSignal);
  const contextPosts = posts.filter(isContextPublicSignal);
  const hasPublishedPosts = state.kind === "published";
  const briefingDate = posts[0]?.briefingDate ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-6">
      <MvpMeasurementTracker
        pageView={{
          eventName: "signals_page_view",
          route: "/signals",
          surface: "signals_index",
          briefingDate,
          metadata: {
            visibleSignalCount: posts.length,
            coreSignalCount: corePosts.length,
            contextSignalCount: contextPosts.length,
            rendersCoreAndContext: corePosts.length === 5 && contextPosts.length === 2,
            stateKind: state.kind,
          },
        }}
      />
      <div className="space-y-5">
        <header className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Published editorial layer</Badge>
            {hasPublishedPosts ? <Badge>{posts.length} signals</Badge> : <Badge>Briefing pending</Badge>}
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] md:text-3xl">
                Published Signals
              </h1>
              <p className="text-base leading-7 text-[var(--text-secondary)]">
                The current editor-approved public briefing.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/">Home briefing</Link>
            </Button>
          </div>
        </header>

        {hasPublishedPosts ? (
          <div className="space-y-7">
            <SignalSection
              title="Core Signals"
              description="The highest-priority published Signals for the current briefing."
              posts={corePosts}
              briefingDate={briefingDate}
            />
            {contextPosts.length > 0 ? (
              <SignalSection
                title="Context Signals"
                description="Published Context Signals that add useful adjacent explanation without displacing the Core slate."
                posts={contextPosts}
                briefingDate={briefingDate}
              />
            ) : null}
          </div>
        ) : state.kind === "temporarily_unavailable" ? (
          <Panel className="p-6">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              Published briefing is temporarily unavailable
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              The reviewed briefing is being kept offline until it can be read safely. Check back shortly.
            </p>
          </Panel>
        ) : (
          <Panel className="p-6">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              Published Signals are not available yet
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              The public signal page will appear after an editor approves and publishes the current Signal slate.
            </p>
          </Panel>
        )}
      </div>
    </main>
  );
}

function SignalSection({
  title,
  description,
  posts,
  briefingDate,
}: {
  title: string;
  description: string;
  posts: EditorialSignalPost[];
  briefingDate: string | null;
}) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-normal text-[var(--text-primary)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
      <ol className="space-y-4">
        {posts.map((post) => (
          <li key={post.id}>
            <Panel className="p-5">
              <div className="grid gap-4 md:grid-cols-[3rem_1fr]">
                <span className="flex h-10 w-10 items-center justify-center rounded-card bg-[var(--sidebar)] text-sm font-semibold text-[var(--text-primary)]">
                  {getPublicSignalDisplayRank(post)}
                </span>
                <div className="min-w-0 space-y-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold leading-7 text-[var(--text-primary)]">
                      {post.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <span>{post.sourceName || "Unknown source"}</span>
                      {post.sourceUrl ? (
                        <a
                          href={post.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                          data-mvp-measurement-event="source_click"
                          data-mvp-route="/signals"
                          data-mvp-surface="signals_published_slate"
                          data-mvp-signal-post-id={post.id}
                          data-mvp-signal-slug={post.title}
                          data-mvp-signal-rank={getPublicSignalDisplayRank(post)}
                          data-mvp-briefing-date={briefingDate ?? undefined}
                          data-mvp-source-name={post.sourceName || "Unknown source"}
                        >
                          Source
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">{post.summary}</p>
                  <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
                    <p className="section-label">Why it matters</p>
                    <p className="mt-2 text-base leading-7 text-[var(--text-primary)]">
                      {post.publishedWhyItMatters}
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          </li>
        ))}
      </ol>
    </section>
  );
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
