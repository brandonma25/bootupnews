import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getPublishedSignalPosts } from "@/lib/signals-editorial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top 5 Signals",
};

export default async function PublicSignalsPage() {
  const posts = await getPublishedSignalPosts();

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
                Top 5 Signals
              </h1>
              <p className="text-base leading-7 text-[var(--text-secondary)]">
                The current published signal list with editor-approved Why it matters context.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/">Home briefing</Link>
            </Button>
          </div>
        </header>

        {posts.length === 5 ? (
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
                        <h2 className="mt-3 text-xl font-semibold leading-7 text-[var(--text-primary)]">
                          {post.title}
                        </h2>
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
        ) : (
          <Panel className="p-6">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              Published Top 5 Signals are not available yet
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              The public signal page will appear after an editor approves and publishes all five posts.
            </p>
          </Panel>
        )}
      </div>
    </main>
  );
}
