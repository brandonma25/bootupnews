import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Lock,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
} from "lucide-react";

import {
  approveSignalPostAction,
  publishTopSignalsAction,
  resetSignalPostToAiDraftAction,
  saveSignalDraftAction,
} from "@/app/dashboard/signals/editorial-review/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  SIGNALS_EDITORIAL_ROUTE,
  getEditorialReviewState,
  type EditorialSignalPost,
} from "@/lib/signals-editorial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top 5 Signals Editorial Review",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignalsEditorialReviewPage({ searchParams }: PageProps) {
  const [state, resolvedSearchParams] = await Promise.all([
    getEditorialReviewState(SIGNALS_EDITORIAL_ROUTE),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const successMessage = readSingleParam(resolvedSearchParams?.success);
  const errorMessage = readSingleParam(resolvedSearchParams?.error);

  if (state.kind === "unauthenticated") {
    return (
      <AccessState
        title="Admin sign-in required"
        detail="Sign in with an authorized Google account to review Top 5 Signals."
        badge="Unauthenticated"
        href={`/login?redirectTo=${encodeURIComponent(SIGNALS_EDITORIAL_ROUTE)}`}
        cta="Sign in"
      />
    );
  }

  if (state.kind === "unauthorized") {
    return (
      <AccessState
        title="Not authorized"
        detail={`${state.userEmail ?? "This account"} does not have admin/editor access for Top 5 Signals.`}
        badge="Unauthorized"
        href="/"
        cta="Return home"
      />
    );
  }

  const posts = state.posts.slice().sort((left, right) => left.rank - right.rank);
  const allApproved = posts.length === 5 && posts.every((post) => post.editorialStatus === "approved");
  const allPublished = posts.length === 5 && posts.every((post) => post.editorialStatus === "published");
  const publishBlockedReason = getPublishBlockedReason(posts, state.storageReady, allApproved, allPublished);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="space-y-5">
        <header className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Admin/editor only</Badge>
            <Badge>{state.adminEmail}</Badge>
            <Badge>{posts.length} signal posts</Badge>
          </div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] md:text-3xl">
                Top 5 Signals — Editorial Review
              </h1>
              <p className="text-base leading-7 text-[var(--text-secondary)]">
                Review, edit, approve, and publish the final ‘Why it matters’ layer.
              </p>
            </div>
            <form action={publishTopSignalsAction} className="space-y-2">
              <Button
                type="submit"
                disabled={!allApproved}
                className="w-full gap-2 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                Publish Top 5 Signals
              </Button>
              {publishBlockedReason ? (
                <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                  {publishBlockedReason}
                </p>
              ) : null}
            </form>
          </div>
        </header>

        {successMessage ? <StatusBanner tone="success" message={successMessage} /> : null}
        {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}
        {state.warning ? <StatusBanner tone="warning" message={state.warning} /> : null}

        <section className="space-y-4">
          {posts.length > 0 ? (
            posts.map((post) => <SignalPostEditor key={post.id} post={post} storageReady={state.storageReady} />)
          ) : (
            <Panel className="p-6">
              <p className="text-base font-semibold text-[var(--text-primary)]">No signal posts ready for review</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                The editorial table is empty or unavailable. Recheck storage configuration and refresh this page.
              </p>
            </Panel>
          )}
        </section>
      </div>
    </main>
  );
}

function getPublishBlockedReason(
  posts: EditorialSignalPost[],
  storageReady: boolean,
  allApproved: boolean,
  allPublished: boolean,
) {
  if (!storageReady) {
    return "Publishing is blocked until editorial storage is configured.";
  }

  if (posts.length !== 5) {
    return `Publishing requires exactly five signal posts. Current count: ${posts.length}.`;
  }

  if (allPublished) {
    return "This Top 5 list is already published. Save and approve an edit to publish a new version.";
  }

  if (!allApproved) {
    return "Approve all five signal posts before publishing.";
  }

  return null;
}

function AccessState({
  title,
  detail,
  badge,
  href,
  cta,
}: {
  title: string;
  detail: string;
  badge: string;
  href: string;
  cta: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Panel className="w-full p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-[var(--sidebar)]">
            <Lock className="h-5 w-5 text-[var(--text-primary)]" />
          </span>
          <div className="space-y-3">
            <Badge>{badge}</Badge>
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
              {title}
            </h1>
            <p className="text-base leading-7 text-[var(--text-secondary)]">{detail}</p>
            <Button asChild variant="secondary">
              <Link href={href}>{cta}</Link>
            </Button>
          </div>
        </div>
      </Panel>
    </main>
  );
}

function StatusBanner({ tone, message }: { tone: "success" | "error" | "warning"; message: string }) {
  const Icon = tone === "success" ? CheckCircle2 : ShieldAlert;

  return (
    <Panel className="p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-primary)]" />
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
      </div>
    </Panel>
  );
}

function SignalPostEditor({
  post,
  storageReady,
}: {
  post: EditorialSignalPost;
  storageReady: boolean;
}) {
  const editableText = post.editedWhyItMatters || post.aiWhyItMatters;
  const controlsDisabled = !storageReady || !post.persisted;

  return (
    <Panel className="p-5">
      <form className="space-y-5">
        <input type="hidden" name="postId" value={post.id} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-card bg-[var(--sidebar)] text-sm font-semibold text-[var(--text-primary)]">
                {post.rank}
              </span>
              <Badge>{formatStatus(post.editorialStatus)}</Badge>
              {post.signalScore !== null ? <Badge>Score {Math.round(post.signalScore)}</Badge> : null}
              {post.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <div>
              <h2 className="text-xl font-semibold leading-7 text-[var(--text-primary)]">{post.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span>{post.sourceName || "Unknown source"}</span>
                {post.sourceUrl ? (
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    Source URL
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{post.summary}</p>
            {post.selectionReason ? (
              <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="section-label">Selection reason</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{post.selectionReason}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="section-label">AI-generated reference</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{post.aiWhyItMatters}</p>
          </div>
        </div>

        <div>
          <label
            htmlFor={`editedWhyItMatters-${post.id}`}
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            Why it matters — editorial version
          </label>
          <textarea
            id={`editedWhyItMatters-${post.id}`}
            name="editedWhyItMatters"
            defaultValue={editableText}
            rows={5}
            className="mt-2 w-full resize-y rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            formAction={saveSignalDraftAction}
            variant="secondary"
            disabled={controlsDisabled}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            type="submit"
            formAction={approveSignalPostAction}
            disabled={controlsDisabled}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            type="submit"
            formAction={resetSignalPostToAiDraftAction}
            variant="ghost"
            disabled={controlsDisabled}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to AI Draft
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
