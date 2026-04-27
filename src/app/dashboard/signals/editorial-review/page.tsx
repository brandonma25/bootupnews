import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  Send,
  ShieldAlert,
} from "lucide-react";

import {
  approveAllSignalPostsAction,
  publishTopSignalsAction,
} from "@/app/dashboard/signals/editorial-review/actions";
import { ApproveAllButton } from "@/app/dashboard/signals/editorial-review/ApproveAllButton";
import { SignalPostEditor } from "@/app/dashboard/signals/editorial-review/StructuredEditorialFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  SIGNALS_EDITORIAL_ROUTE,
  getEditorialReviewState,
  sortEditorialHistoryPostsReverseChronological,
  type EditorialScopeFilter,
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

type PageSearchParams = Record<string, string | string[] | undefined>;

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignalsEditorialReviewPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await (searchParams ? searchParams : Promise.resolve(undefined));
  const successMessage = readSingleParam(resolvedSearchParams?.success);
  const errorMessage = readSingleParam(resolvedSearchParams?.error);
  const statusFilter = normalizeStatusFilter(readSingleParam(resolvedSearchParams?.status));
  const scopeFilter = normalizeScopeFilter(readSingleParam(resolvedSearchParams?.scope));
  const searchQuery = normalizeSearchQuery(readSingleParam(resolvedSearchParams?.query));
  const dateFilter = normalizeDateFilter(readSingleParam(resolvedSearchParams?.date));
  const page = normalizePageNumber(readSingleParam(resolvedSearchParams?.page));
  const state = await getEditorialReviewState(SIGNALS_EDITORIAL_ROUTE, {
    status: statusFilter,
    scope: scopeFilter,
    query: searchQuery,
    date: dateFilter,
    page,
  });

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

  const posts = sortEditorialHistoryPostsReverseChronological(state.posts);
  const visiblePosts = posts;
  const topFivePosts = (state.currentTopFive ?? posts)
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 5);
  const allPublished = topFivePosts.length === 5 && topFivePosts.every((post) => post.editorialStatus === "published");
  const publishBlockedReason = getPublishBlockedReason(topFivePosts, state.storageReady, allPublished);
  const approveAllPosts = visiblePosts.filter(isBulkApprovablePost);
  const statusCounts = getStatusCounts(posts);
  const approveAllBlockedReason = getApproveAllBlockedReason(visiblePosts, state.storageReady, approveAllPosts.length);
  const totalMatchingPosts = state.totalMatchingPosts ?? posts.length;
  const pageSize = state.pageSize ?? Math.max(posts.length, 1);
  const currentPage = state.page ?? 1;
  const pageCount = Math.max(1, Math.ceil(Math.max(totalMatchingPosts, 1) / pageSize));
  const currentSetLabel = state.latestBriefingDate ? `Current set ${state.latestBriefingDate}` : "Current set";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="space-y-5">
        <header className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Admin/editor only</Badge>
            <Badge>{state.adminEmail}</Badge>
            <Badge>{totalMatchingPosts} matching posts</Badge>
            <Badge>{currentSetLabel}</Badge>
            <Badge>{topFivePosts.length} current cards</Badge>
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
          <div className="flex flex-wrap gap-2" aria-label="Editorial scope filters">
            {SCOPE_FILTERS.map((filter) => (
              <ScopeFilterLink
                key={filter.value}
                filter={filter.value}
                label={filter.label}
                active={state.appliedScope === filter.value}
                searchParams={resolvedSearchParams ?? {}}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Editorial status filters">
            {STATUS_FILTERS.map((filter) => (
              <StatusFilterLink
                key={filter.value}
                filter={filter.value}
                label={`${filter.label} (${getFilterCount(statusCounts, posts.length, filter.value)})`}
                active={state.appliedStatus === filter.value}
                searchParams={resolvedSearchParams ?? {}}
              />
            ))}
          </div>
          <form className="grid gap-3 rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 md:grid-cols-[minmax(0,1fr)_12rem_10rem_auto]">
            <input type="hidden" name="status" value={state.appliedStatus} />
            <input type="hidden" name="scope" value={state.appliedScope} />
            <div className="space-y-2">
              <label htmlFor="query" className="section-label">Search</label>
              <input
                id="query"
                name="query"
                defaultValue={state.appliedQuery}
                placeholder="Search title or source"
                className="w-full rounded-button border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date" className="section-label">Briefing date</label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={state.appliedDate ?? ""}
                className="w-full rounded-button border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="page" className="section-label">Page</label>
              <input
                id="page"
                name="page"
                type="number"
                min={1}
                max={pageCount}
                defaultValue={currentPage}
                className="w-full rounded-button border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary">Apply</Button>
              <Button asChild variant="ghost">
                <Link href={SIGNALS_EDITORIAL_ROUTE}>Reset</Link>
              </Button>
            </div>
          </form>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Historical daily Top 5 snapshots are editable here. The current working set is the latest briefing date; the public homepage continues to use only the explicitly live published set.
          </p>
        </section>

        <section className="space-y-4">
          {visiblePosts.length > 0 ? (
            visiblePosts.map((post) => <SignalPostEditor key={post.id} post={post} storageReady={state.storageReady} />)
          ) : (
            <Panel className="p-6">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {getEmptyStateTitle(state.appliedScope, state.appliedStatus)}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {getEmptyStateDetail(state.appliedScope, state.appliedStatus, state.appliedDate, state.appliedQuery)}
              </p>
            </Panel>
          )}
          {pageCount > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {pageCount}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="secondary">
                  <Link
                    href={buildEditorialHref(resolvedSearchParams ?? {}, { page: Math.max(1, currentPage - 1) })}
                    aria-disabled={currentPage <= 1}
                    className={currentPage <= 1 ? "pointer-events-none opacity-40" : undefined}
                  >
                    Previous
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link
                    href={buildEditorialHref(resolvedSearchParams ?? {}, { page: Math.min(pageCount, currentPage + 1) })}
                    aria-disabled={currentPage >= pageCount}
                    className={currentPage >= pageCount ? "pointer-events-none opacity-40" : undefined}
                  >
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

const SCOPE_FILTERS: Array<{ value: EditorialScopeFilter; label: string }> = [
  { value: "all", label: "All Dates" },
  { value: "current", label: "Current" },
  { value: "historical", label: "Historical" },
];

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

function normalizeScopeFilter(value: string | undefined): EditorialScopeFilter {
  if (value === "current" || value === "historical") {
    return value;
  }

  return "all";
}

function normalizeSearchQuery(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeDateFilter(value: string | undefined) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value ?? null : null;
}

function normalizePageNumber(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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

function isBulkApprovablePost(post: EditorialSignalPost) {
  return (
    post.persisted &&
    ["draft", "needs_review"].includes(post.editorialStatus) &&
    post.whyItMattersValidationStatus !== "requires_human_rewrite"
  );
}

function StatusFilterLink({
  filter,
  label,
  active,
  searchParams,
}: {
  filter: EditorialPostStatusFilter;
  label: string;
  active: boolean;
  searchParams: PageSearchParams;
}) {
  const href = buildEditorialHref(searchParams, {
    status: filter === "all" ? null : filter,
    page: null,
  });

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

function ScopeFilterLink({
  filter,
  label,
  active,
  searchParams,
}: {
  filter: EditorialScopeFilter;
  label: string;
  active: boolean;
  searchParams: PageSearchParams;
}) {
  const href = buildEditorialHref(searchParams, {
    scope: filter === "all" ? null : filter,
    page: null,
  });

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

function buildEditorialHref(
  searchParams: PageSearchParams,
  updates: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const singleValue = readSingleParam(value);
    if (singleValue) {
      params.set(key, singleValue);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${SIGNALS_EDITORIAL_ROUTE}?${query}` : SIGNALS_EDITORIAL_ROUTE;
}

function getEmptyStateTitle(scope: EditorialScopeFilter, status: EditorialPostStatusFilter) {
  if (scope === "historical" && status === "review") {
    return "No historical review-queue posts";
  }

  if (scope === "historical") {
    return "No historical signal posts match this filter";
  }

  if (status === "review") {
    return "No signal posts are waiting for review";
  }

  return "No signal posts match this filter";
}

function getEmptyStateDetail(
  scope: EditorialScopeFilter,
  status: EditorialPostStatusFilter,
  date: string | null,
  query: string,
) {
  if (scope === "historical" && status === "review") {
    return "Older briefing dates currently have no Draft or Needs Review posts. Try All Dates or Current to inspect the latest working set.";
  }

  if (date || query) {
    return "Try clearing the date or search filter if you expected signal posts to appear here.";
  }

  if (status === "review") {
    return "Review Queue only includes Draft and Needs Review posts. Approved and Published rows stay editable in the other filters.";
  }

  return "Switch scope or status filters if you expected signal posts to appear here.";
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

  const rewriteRequiredCount = posts.filter(
    (post) =>
      post.persisted &&
      ["draft", "needs_review"].includes(post.editorialStatus) &&
      post.whyItMattersValidationStatus === "requires_human_rewrite",
  ).length;

  if (rewriteRequiredCount > 0) {
    return `${rewriteRequiredCount} signal posts require a human rewrite before bulk approval.`;
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

  const rewriteRequiredCount = posts.filter(
    (post) => post.whyItMattersValidationStatus === "requires_human_rewrite",
  ).length;

  if (rewriteRequiredCount > 0) {
    return `${rewriteRequiredCount} signal posts require a human rewrite before publishing.`;
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
