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
  approveAllSignalPostsAction,
  approveSignalPostAction,
  publishTopSignalsAction,
  publishSignalPostAction,
  resetSignalPostToAiDraftAction,
  saveSignalDraftAction,
} from "@/app/dashboard/signals/editorial-review/actions";
import { ApproveAllButton } from "@/app/dashboard/signals/editorial-review/ApproveAllButton";
import { StructuredEditorialFields } from "@/app/dashboard/signals/editorial-review/StructuredEditorialFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  SIGNALS_EDITORIAL_ROUTE,
  getEditorialReviewState,
  type EditorialPostStatusFilter,
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
  const statusFilter = normalizeStatusFilter(readSingleParam(resolvedSearchParams?.status));

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

  const posts = state.posts.slice().sort(sortEditorialPosts);
  const visiblePosts = filterPostsByStatus(posts, statusFilter);
  const topFivePosts = posts.slice().sort((left, right) => left.rank - right.rank).slice(0, 5);
  const allPublished = topFivePosts.length === 5 && topFivePosts.every((post) => post.editorialStatus === "published");
  const publishBlockedReason = getPublishBlockedReason(topFivePosts, state.storageReady, allPublished);
  const approveAllPosts = visiblePosts.filter(isBulkApprovablePost);
  const statusCounts = getStatusCounts(posts);
  const approveAllBlockedReason = getApproveAllBlockedReason(visiblePosts, state.storageReady, approveAllPosts.length);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="space-y-5">
        <header className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Admin/editor only</Badge>
            <Badge>{state.adminEmail}</Badge>
            <Badge>{posts.length} total posts</Badge>
            <Badge>{visiblePosts.length} visible</Badge>
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
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem]">
              <form action={approveAllSignalPostsAction} className="space-y-2">
                <div data-approve-all-fields hidden>
                  {approveAllPosts.map((post) => (
                    <span key={post.id}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input
                        type="hidden"
                        name="editedWhyItMatters"
                        value={post.editedWhyItMatters || post.aiWhyItMatters}
                      />
                    </span>
                  ))}
                </div>
                <ApproveAllButton disabled={Boolean(approveAllBlockedReason)} />
                {approveAllBlockedReason ? (
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {approveAllBlockedReason}
                  </p>
                ) : null}
              </form>
              <form action={publishTopSignalsAction} className="space-y-2">
                <Button
                  type="submit"
                  disabled={Boolean(publishBlockedReason)}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  Publish Top 5 Signals
                </Button>
                {publishBlockedReason ? (
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {publishBlockedReason}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </header>

        {successMessage ? <StatusBanner tone="success" message={successMessage} /> : null}
        {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}
        {state.warning ? <StatusBanner tone="warning" message={state.warning} /> : null}

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2" aria-label="Editorial status filters">
            {STATUS_FILTERS.map((filter) => (
              <StatusFilterLink
                key={filter.value}
                filter={filter.value}
                label={`${filter.label} (${getFilterCount(statusCounts, posts.length, filter.value)})`}
                active={statusFilter === filter.value}
              />
            ))}
          </div>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            All persisted signal posts are editable here. Approved posts are ready to publish; Published posts are already live. Approve All only applies to currently visible posts with Draft or Needs Review status.
          </p>
        </section>

        <section className="space-y-4">
          {visiblePosts.length > 0 ? (
            visiblePosts.map((post) => <SignalPostEditor key={post.id} post={post} storageReady={state.storageReady} />)
          ) : (
            <Panel className="p-6">
              <p className="text-base font-semibold text-[var(--text-primary)]">No signal posts match this filter</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Switch filters or recheck storage configuration if you expected posts to appear here.
              </p>
            </Panel>
          )}
        </section>
      </div>
    </main>
  );
}

const STATUS_FILTERS: Array<{ value: EditorialPostStatusFilter; label: string }> = [
  { value: "all", label: "All Posts" },
  { value: "review", label: "Review Queue" },
  { value: "draft", label: "Draft" },
  { value: "needs_review", label: "Needs Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
];

function normalizeStatusFilter(value: string | undefined): EditorialPostStatusFilter {
  if (
    value === "review" ||
    value === "draft" ||
    value === "needs_review" ||
    value === "approved" ||
    value === "published"
  ) {
    return value;
  }

  return "all";
}

function getStatusCounts(posts: EditorialSignalPost[]) {
  return posts.reduce(
    (counts, post) => {
      counts[post.editorialStatus] += 1;
      return counts;
    },
    {
      draft: 0,
      needs_review: 0,
      approved: 0,
      published: 0,
    } satisfies Record<"draft" | "needs_review" | "approved" | "published", number>,
  );
}

function getFilterCount(
  statusCounts: ReturnType<typeof getStatusCounts>,
  totalCount: number,
  filter: EditorialPostStatusFilter,
) {
  if (filter === "all") {
    return totalCount;
  }

  if (filter === "review") {
    return statusCounts.draft + statusCounts.needs_review;
  }

  return statusCounts[filter];
}

function filterPostsByStatus(posts: EditorialSignalPost[], filter: EditorialPostStatusFilter) {
  if (filter === "all") {
    return posts;
  }

  if (filter === "review") {
    return posts.filter(isBulkApprovablePost);
  }

  return posts.filter((post) => post.editorialStatus === filter);
}

function isBulkApprovablePost(post: EditorialSignalPost) {
  return post.persisted && ["draft", "needs_review"].includes(post.editorialStatus);
}

function sortEditorialPosts(left: EditorialSignalPost, right: EditorialSignalPost) {
  const leftUpdated = Date.parse(left.updatedAt ?? left.createdAt ?? "") || 0;
  const rightUpdated = Date.parse(right.updatedAt ?? right.createdAt ?? "") || 0;

  if (leftUpdated !== rightUpdated) {
    return rightUpdated - leftUpdated;
  }

  return left.rank - right.rank;
}

function StatusFilterLink({
  filter,
  label,
  active,
}: {
  filter: EditorialPostStatusFilter;
  label: string;
  active: boolean;
}) {
  const href = filter === "all" ? SIGNALS_EDITORIAL_ROUTE : `${SIGNALS_EDITORIAL_ROUTE}?status=${filter}`;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex min-h-10 items-center rounded-button border px-3 text-sm font-medium transition-colors",
        active
          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function getApproveAllBlockedReason(
  posts: EditorialSignalPost[],
  storageReady: boolean,
  eligibleCount: number,
) {
  if (!storageReady) {
    return "Bulk approval is blocked until editorial storage is configured.";
  }

  if (posts.length === 0) {
    return "No signal posts are loaded for approval.";
  }

  if (eligibleCount === 0) {
    return "Approve All applies only to visible Draft and Needs Review posts. Switch to Review Queue or edit this status individually.";
  }

  const missingEditorialTextCount = posts.filter(
    (post) =>
      post.persisted &&
      ["draft", "needs_review"].includes(post.editorialStatus) &&
      !normalizeEditorialText(post.editedWhyItMatters || post.aiWhyItMatters),
  ).length;

  if (missingEditorialTextCount > 0) {
    return `${missingEditorialTextCount} eligible signal posts need editorial text before bulk approval.`;
  }

  return null;
}

function getPublishBlockedReason(
  posts: EditorialSignalPost[],
  storageReady: boolean,
  allPublished: boolean,
) {
  if (!storageReady) {
    return "Publishing is blocked until editorial storage is configured.";
  }

  if (posts.length !== 5) {
    return `Publishing requires exactly five ranked signal posts. Current count: ${posts.length}.`;
  }

  if (allPublished) {
    return "This Top 5 list is already published. Save and approve an edit to publish a new version.";
  }

  const blockedCount = posts.filter(
    (post) => !["approved", "published"].includes(post.editorialStatus),
  ).length;

  if (blockedCount > 0) {
    return "Approve all five signal posts before publishing. Already published posts remain publish-ready.";
  }

  return null;
}

function normalizeEditorialText(value: string | null | undefined) {
  return value?.trim() ?? "";
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
  const editableText = post.editedWhyItMatters || post.publishedWhyItMatters || post.aiWhyItMatters;
  const structuredContent =
    post.editedWhyItMattersStructured ?? post.publishedWhyItMattersStructured;
  const controlsDisabled = !storageReady || !post.persisted;
  const eligibleForApproveAll =
    post.persisted && ["draft", "needs_review"].includes(post.editorialStatus);
  const canPublishPost = post.editorialStatus === "approved";

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

        <StructuredEditorialFields
          postId={post.id}
          aiWhyItMatters={post.aiWhyItMatters}
          legacyText={editableText}
          structuredContent={structuredContent}
          eligibleForApproveAll={eligibleForApproveAll}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            formAction={saveSignalDraftAction}
            variant="secondary"
            disabled={controlsDisabled}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Edits
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
          {canPublishPost ? (
            <Button
              type="submit"
              formAction={publishSignalPostAction}
              disabled={controlsDisabled}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Publish
            </Button>
          ) : null}
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
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {getPostStateHint(post)}
        </p>
      </form>
    </Panel>
  );
}

function getPostStateHint(post: EditorialSignalPost) {
  if (post.editorialStatus === "approved") {
    return "Approved and waiting to publish. Publish this card or use Publish Top 5 Signals when the full Top 5 is ready.";
  }

  if (post.editorialStatus === "published") {
    return "Published copy is live for public signal surfaces. Saving edits to this card updates the published copy.";
  }

  return "Save edits as a draft or approve this card before publishing.";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
