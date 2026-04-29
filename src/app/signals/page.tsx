import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  getPublishedSignalPosts,
  type EditorialSignalPost,
} from "@/lib/signals-editorial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Published Signals",
};

export default async function PublicSignalsPage() {
  const posts = await getPublishedSignalPosts();
  const corePosts = posts.filter((post) => post.rank >= 1 && post.rank <= 5);
  const contextPosts = posts.filter((post) => post.rank >= 6 && post.rank <= 7);
  const hasPublishedPosts = posts.length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-6">
      <div className="space-y-5">
        <header className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Published editorial layer</Badge>
            <Badge>{posts.length} signals</Badge>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] md:text-3xl">
                Published Signals
              </h1>
              <p className="text-base leading-7 text-[var(--text-secondary)]">
                The current published briefing: Top 5 Core Signals plus the next 2 Context Signals.
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
              title="Top 5 Core Signals"
              description="The five highest-priority published Signals for the current briefing."
              posts={corePosts}
            />
            {contextPosts.length > 0 ? (
              <SignalSection
                title="Next 2 Context Signals"
                description="Published Context Signals that add useful adjacent explanation without displacing the Core slate."
                posts={contextPosts}
              />
            ) : null}
          </div>
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
}: {
  title: string;
  description: string;
  posts: EditorialSignalPost[];
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
                  {post.rank}
                </span>
                <div className="min-w-0 space-y-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                      {post.signalScore !== null ? <Badge>Score {Math.round(post.signalScore)}</Badge> : null}
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
