import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  Send,
  ShieldAlert,
} from "lucide-react";

import {
  assignFinalSlateSlotAction,
  approveAllSignalPostsAction,
  publishFinalSlateAction,
  removeFromFinalSlateAction,
  replaceFinalSlateSlotAction,
} from "@/app/dashboard/signals/editorial-review/actions";
import { ApproveAllButton } from "@/app/dashboard/signals/editorial-review/ApproveAllButton";
import { SignalPostEditor } from "@/app/dashboard/signals/editorial-review/StructuredEditorialFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  FINAL_SLATE_RANKS,
  formatSlotLabel,
  getFinalSlateTierForRank,
  validateFinalSlateReadiness,
  type FinalSlateReadinessResult,
} from "@/lib/final-slate-readiness";
import {
  SIGNALS_EDITORIAL_ROUTE,
  getEditorialReviewState,
  sortEditorialHistoryPostsReverseChronological,
  type EditorialScopeFilter,
  type EditorialPostStatusFilter,
  type EditorialSignalPost,
  type PublishedSlateAudit,
} from "@/lib/signals-editorial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Signals Final-Slate Composer",
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
  const currentCandidates = (state.currentCandidates ?? [])
    .slice()
    .sort((left, right) => left.rank - right.rank);
  const topFivePosts = (state.currentTopFive ?? posts)
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 5);
  const finalSlateReadiness = validateFinalSlateReadiness(currentCandidates);
  const publishDisabledReason = getComposerPublishDisabledReason(
    finalSlateReadiness,
    state.storageReady,
    state.auditStorageReady,
  );
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
            <Badge>{currentCandidates.length || topFivePosts.length} current candidates</Badge>
          </div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] md:text-3xl">
                Signals Final-Slate Composer
              </h1>
              <p className="text-base leading-7 text-[var(--text-secondary)]">
                Compose, publish, and audit the reviewed 5 Core + 2 Context slate.
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
              <div className="space-y-2">
                <form action={publishFinalSlateAction}>
                  <Button
                    type="submit"
                    disabled={Boolean(publishDisabledReason)}
                    className="w-full gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Publish Final Slate
                  </Button>
                </form>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  {publishDisabledReason ?? getReadyToPublishMessage()}
                </p>
              </div>
            </div>
          </div>
        </header>

        {successMessage ? <StatusBanner tone="success" message={successMessage} /> : null}
        {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}
        {state.warning ? <StatusBanner tone="warning" message={state.warning} /> : null}
        {state.auditWarning ? <StatusBanner tone="warning" message={state.auditWarning} /> : null}

        <FinalSlateComposer
          candidates={currentCandidates}
          readiness={finalSlateReadiness}
          storageReady={state.storageReady}
          auditStorageReady={state.auditStorageReady}
        />

        <PublishedSlateAuditSummary
          audit={state.latestPublishedSlateAudit}
          auditStorageReady={state.auditStorageReady}
        />

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
          <p className="break-words text-sm leading-6 text-[var(--text-secondary)]">
            Historical snapshots are editable here. The current working set is the latest briefing date; the public homepage continues to use only the explicitly live published set.
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

function FinalSlateComposer({
  candidates,
  readiness,
  storageReady,
  auditStorageReady,
}: {
  candidates: EditorialSignalPost[];
  readiness: FinalSlateReadinessResult;
  storageReady: boolean;
  auditStorageReady: boolean;
}) {
  const selectedCount = readiness.selectedRows.length;
  const coreCount = readiness.selectedRows.filter((post) => post.finalSlateTier === "core").length;
  const contextCount = readiness.selectedRows.filter((post) => post.finalSlateTier === "context").length;
  const publishDisabledReason = getComposerPublishDisabledReason(readiness, storageReady, auditStorageReady);

  return (
    <section className="space-y-4" aria-labelledby="final-slate-composer-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 id="final-slate-composer-title" className="text-xl font-semibold tracking-normal text-[var(--text-primary)]">
            Final Slate Composer
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Assign reviewed candidates into Core slots 1-5 and Context slots 6-7. Slot placement does not make a row public.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{selectedCount}/7 selected</Badge>
          <Badge>{coreCount}/5 Core</Badge>
          <Badge>{contextCount}/2 Context</Badge>
          <Badge>{readiness.ready ? "Slate ready" : "Slate not ready"}</Badge>
        </div>
      </div>

      <Panel className="p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {FINAL_SLATE_RANKS.map((rank) => (
              <FinalSlateSlot
                key={rank}
                rank={rank}
                post={candidates.find((candidate) => candidate.finalSlateRank === rank) ?? null}
                rowFailures={readiness.rowFailures}
                slotFailures={readiness.slotFailures[rank] ?? []}
                candidates={candidates}
                storageReady={storageReady}
              />
            ))}
          </div>
          <div className="space-y-3 rounded-card border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center gap-2">
              {readiness.ready ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-[var(--accent)]" />
              )}
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Publish Readiness
              </h3>
            </div>
            <form action={publishFinalSlateAction}>
              <Button type="submit" disabled={Boolean(publishDisabledReason)} className="w-full gap-2">
                <Send className="h-4 w-4" />
                Publish Final Slate
              </Button>
            </form>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {publishDisabledReason ?? getReadyToPublishMessage()}
            </p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Publishing archives the previous live slate and makes only these seven selected rows public.
            </p>
            {readiness.failures.length > 0 ? (
              <ul className="space-y-1 text-sm leading-6 text-[var(--text-secondary)]">
                {readiness.failures.slice(0, 8).map((failure) => (
                  <li key={`${failure.code}-${failure.rowId ?? "slate"}-${failure.rank ?? "none"}-${failure.message}`}>
                    {failure.message}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Post-publish verification
              </h4>
              <ul className="space-y-1 text-xs leading-5 text-[var(--text-secondary)]">
                <li>Homepage returns 200 and shows Core slots 1-5.</li>
                <li>/signals returns 200 and shows Core slots 1-5 plus Context slots 6-7.</li>
                <li>Held, rejected, rewrite-requested, Depth, rank-8, and unpublished rows stay hidden.</li>
                <li>Cron remains disabled.</li>
              </ul>
            </div>
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Rollback preparation
              </h4>
              <p className="text-xs leading-5 text-[var(--text-secondary)]">
                If verification fails, identify the newly live seven rows, turn them non-live, and restore the archived previous live rows.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="p-4">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Candidate Pool</h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Current briefing candidates stay non-live while editors assign final public placement.
            </p>
          </div>
          <Badge>{candidates.length} candidates</Badge>
        </div>
        {candidates.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {candidates.map((post) => (
              <FinalSlateCandidateRow
                key={post.id}
                post={post}
                rowFailures={readiness.rowFailures[post.id] ?? []}
                storageReady={storageReady}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            No current briefing candidates are available for slate composition.
          </p>
        )}
      </Panel>
    </section>
  );
}

function PublishedSlateAuditSummary({
  audit,
  auditStorageReady,
}: {
  audit: PublishedSlateAudit | null;
  auditStorageReady: boolean;
}) {
  return (
    <section className="space-y-4" aria-labelledby="published-slate-audit-title">
      <div className="space-y-2">
        <h2 id="published-slate-audit-title" className="text-xl font-semibold tracking-normal text-[var(--text-primary)]">
          Published Slate Audit
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Internal record of the most recent published 5 Core + 2 Context slate. This is not a public archive surface.
        </p>
      </div>
      <Panel className="p-4">
        {!auditStorageReady ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Published-slate audit storage is not ready. Publishing is blocked until audit tables are available.
          </p>
        ) : audit ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Published {formatAuditTimestamp(audit.publishedAt)}</Badge>
              <Badge>{audit.publishedBy ? `By ${audit.publishedBy}` : "Publisher unavailable"}</Badge>
              <Badge>{audit.rowCount} rows</Badge>
              <Badge>{audit.coreCount} Core</Badge>
              <Badge>{audit.contextCount} Context</Badge>
              <Badge>{audit.previousLiveRowIds.length} archived previous live rows</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase tracking-normal text-[var(--text-secondary)]">
                    <th className="py-2 pr-3 font-medium">Rank</th>
                    <th className="py-2 pr-3 font-medium">Tier</th>
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Source</th>
                    <th className="py-2 pr-3 font-medium">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-3 text-[var(--text-primary)]">{item.finalSlateRank}</td>
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">
                        {item.finalSlateTier === "core" ? "Core" : "Context"}
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-primary)]">{item.titleSnapshot}</td>
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">
                        {item.sourceNameSnapshot || "Missing source"}
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">
                        {formatDecision(item.editorialDecisionSnapshot)}
                        {item.replacementOfRowIdSnapshot ? " · Replacement" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-card border border-[var(--border)] bg-[var(--card)] p-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Archived previous live rows</h3>
                <p className="break-words text-xs leading-5 text-[var(--text-secondary)]">
                  {audit.previousLiveRowIds.length > 0
                    ? audit.previousLiveRowIds.join(", ")
                    : "No previous live rows were present."}
                </p>
              </div>
              <div className="space-y-2 rounded-card border border-[var(--border)] bg-[var(--card)] p-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rollback preparation</h3>
                <p className="text-xs leading-5 text-[var(--text-secondary)]">
                  {audit.rollbackNote ?? "Rollback execution is not implemented in this phase."}
                </p>
              </div>
            </div>
            {audit.verificationChecklist ? (
              <div className="space-y-2 border-t border-[var(--border)] pt-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Verification checklist
                </h3>
                <p className="text-xs leading-5 text-[var(--text-secondary)]">
                  Status: {audit.verificationChecklist.status === "not_run" ? "Not run" : audit.verificationChecklist.status}
                </p>
                <ul className="space-y-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {audit.verificationChecklist.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            No published slate audit record exists yet. The next successful supported publish will create one.
          </p>
        )}
      </Panel>
    </section>
  );
}

function FinalSlateSlot({
  rank,
  post,
  rowFailures,
  slotFailures,
  candidates,
  storageReady,
}: {
  rank: number;
  post: EditorialSignalPost | null;
  rowFailures: Record<string, string[]>;
  slotFailures: string[];
  candidates: EditorialSignalPost[];
  storageReady: boolean;
}) {
  const tier = getFinalSlateTierForRank(rank);
  const failures = post ? rowFailures[post.id] ?? [] : slotFailures;
  const replacements = post ? getEligibleReplacementCandidates(candidates, post) : [];
  const previousRank = rank > 1 ? rank - 1 : null;
  const nextRank = rank < 7 ? rank + 1 : null;

  return (
    <div className="min-h-56 rounded-card border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge>{formatSlotLabel(rank)}</Badge>
        <Badge>{tier === "context" ? "Context" : "Core"}</Badge>
      </div>
      {post ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">{post.title}</p>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{post.sourceName || "Missing source"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{post.whyItMattersValidationStatus === "passed" ? "WITM passed" : "WITM rewrite required"}</Badge>
            <Badge>{post.editorialStatus}</Badge>
            <Badge>{formatDecision(post.editorialDecision)}</Badge>
            {post.replacementOfRowId ? <Badge>Replacement</Badge> : null}
            {post.isLive ? <Badge>Live warning</Badge> : null}
            {post.publishedAt ? <Badge>Published warning</Badge> : null}
          </div>
          {failures.length > 0 ? (
            <ul className="space-y-1 text-xs leading-5 text-[var(--text-secondary)]">
              {failures.slice(0, 3).map((failure, index) => (
                <li key={`${failure}-${index}`}>{failure}</li>
              ))}
            </ul>
          ) : null}
          <form action={removeFromFinalSlateAction}>
            <input type="hidden" name="postId" value={post.id} />
            <Button type="submit" variant="secondary" disabled={!storageReady} className="w-full">
              Demote / Remove
            </Button>
          </form>
          <div className="grid gap-2 sm:grid-cols-2">
            {previousRank ? (
              <form action={assignFinalSlateSlotAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="finalSlateRank" value={previousRank} />
                <Button type="submit" variant="secondary" disabled={!storageReady} className="w-full">
                  Move Up
                </Button>
              </form>
            ) : null}
            {nextRank ? (
              <form action={assignFinalSlateSlotAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="finalSlateRank" value={nextRank} />
                <Button type="submit" variant="secondary" disabled={!storageReady} className="w-full">
                  Move Down
                </Button>
              </form>
            ) : null}
          </div>
          {replacements.length > 0 ? (
            <form action={replaceFinalSlateSlotAction} className="space-y-2 rounded-card border border-[var(--border)] bg-[var(--card)] p-3">
              <input type="hidden" name="originalPostId" value={post.id} />
              <label className="section-label" htmlFor={`replacementPostId-${post.id}`}>Replace with</label>
              <select
                id={`replacementPostId-${post.id}`}
                name="replacementPostId"
                className="w-full rounded-button border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-primary)]"
                required
              >
                {replacements.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title} - {candidate.sourceName || "Missing source"}
                  </option>
                ))}
              </select>
              <textarea
                name="decisionNote"
                rows={2}
                placeholder="Replacement reason"
                className="w-full resize-y rounded-button border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-primary)]"
                required
              />
              <Button type="submit" variant="secondary" disabled={!storageReady} className="w-full">
                Replace
              </Button>
            </form>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-36 flex-col justify-between gap-3">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {slotFailures[0] ?? "No candidate assigned."}
          </p>
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            Use the assignment controls in the candidate pool.
          </p>
        </div>
      )}
    </div>
  );
}

function FinalSlateCandidateRow({
  post,
  rowFailures,
  storageReady,
}: {
  post: EditorialSignalPost;
  rowFailures: string[];
  storageReady: boolean;
}) {
  const canAssign =
    storageReady &&
    post.persisted &&
    !post.isLive &&
    post.editorialStatus !== "published" &&
    !post.publishedAt &&
    !isBlockingDecision(post.editorialDecision);
  const placement = post.finalSlateRank ? formatSlotLabel(post.finalSlateRank) : "Not selected";

  return (
    <div className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Pipeline rank {post.rank}</Badge>
          <Badge>{placement}</Badge>
          {post.finalSlateRank ? <Badge>Selected for final slate</Badge> : null}
          {post.finalSlateTier ? <Badge>{post.finalSlateTier === "core" ? "Core" : "Context"}</Badge> : null}
          <Badge>{post.editorialStatus}</Badge>
          <Badge>{formatDecision(post.editorialDecision)}</Badge>
          {post.replacementOfRowId ? <Badge>Replacement</Badge> : null}
          <Badge>{post.whyItMattersValidationStatus === "passed" ? "WITM passed" : "WITM failed / requires rewrite"}</Badge>
          <Badge>{post.isLive ? "Live" : "Non-live"}</Badge>
          <Badge>{post.publishedAt ? "Published date set" : "Unpublished"}</Badge>
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-semibold leading-6 text-[var(--text-primary)]">{post.title}</h4>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {post.sourceName || "Missing source"}
            {post.sourceUrl ? ` · ${post.sourceUrl}` : ""}
          </p>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            WITM status: {post.whyItMattersValidationStatus}
          </p>
        </div>
        {post.whyItMattersValidationDetails.length > 0 ? (
          <ul className="space-y-1 text-sm leading-6 text-[var(--text-secondary)]">
            {post.whyItMattersValidationDetails.slice(0, 2).map((detail, index) => (
              <li key={`${detail}-${index}`}>{detail}</li>
            ))}
          </ul>
        ) : null}
        {rowFailures.length > 0 ? (
          <ul className="space-y-1 text-sm leading-6 text-[var(--text-secondary)]">
            {rowFailures.slice(0, 4).map((failure, index) => (
              <li key={`${failure}-${index}`}>{failure}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="section-label">Promote / move to Core slot</p>
        <div className="grid grid-cols-5 gap-2">
          {FINAL_SLATE_RANKS.slice(0, 5).map((rank) => (
            <form key={rank} action={assignFinalSlateSlotAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="finalSlateRank" value={rank} />
              <Button
                type="submit"
                variant={post.finalSlateRank === rank ? "primary" : "secondary"}
                disabled={!canAssign}
                className="h-10 w-full px-0"
                aria-label={`Assign ${post.title} to ${formatSlotLabel(rank)}`}
              >
                {rank}
              </Button>
            </form>
          ))}
        </div>
        <p className="section-label">Move to Context slot</p>
        <div className="grid grid-cols-2 gap-2">
          {FINAL_SLATE_RANKS.slice(5).map((rank) => (
            <form key={rank} action={assignFinalSlateSlotAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="finalSlateRank" value={rank} />
              <Button
                type="submit"
                variant={post.finalSlateRank === rank ? "primary" : "secondary"}
                disabled={!canAssign}
                className="h-10 w-full px-0"
                aria-label={`Assign ${post.title} to ${formatSlotLabel(rank)}`}
              >
                {rank}
              </Button>
            </form>
          ))}
        </div>
        {post.finalSlateRank ? (
          <form action={removeFromFinalSlateAction}>
            <input type="hidden" name="postId" value={post.id} />
            <Button type="submit" variant="secondary" disabled={!storageReady} className="w-full">
              Remove from slate
            </Button>
          </form>
        ) : null}
        <p className="text-xs leading-5 text-[var(--text-secondary)]">
          {canAssign
            ? "Slot assignment updates draft placement only."
            : getAssignmentBlockedReason(post, storageReady)}
        </p>
      </div>
    </div>
  );
}

function getEligibleReplacementCandidates(
  candidates: EditorialSignalPost[],
  original: EditorialSignalPost,
) {
  return candidates.filter(
    (candidate) =>
      candidate.id !== original.id &&
      candidate.persisted &&
      candidate.briefingDate === original.briefingDate &&
      !candidate.finalSlateRank &&
      !candidate.isLive &&
      candidate.editorialStatus !== "published" &&
      !candidate.publishedAt &&
      !isBlockingDecision(candidate.editorialDecision),
  );
}

function isBlockingDecision(decision: string | null) {
  return (
    decision === "rejected" ||
    decision === "held" ||
    decision === "rewrite_requested" ||
    decision === "removed_from_slate"
  );
}

function getAssignmentBlockedReason(post: EditorialSignalPost, storageReady: boolean) {
  if (!storageReady) {
    return "Editorial storage must be configured before placement can change.";
  }

  if (!post.persisted) {
    return "Only persisted rows can be assigned.";
  }

  if (post.isLive) {
    return "Live rows cannot be assigned to the draft final slate.";
  }

  if (post.editorialStatus === "published" || post.publishedAt) {
    return "Already published rows cannot be assigned.";
  }

  if (isBlockingDecision(post.editorialDecision)) {
    return "Rejected, held, rewrite-requested, or removed rows cannot be assigned.";
  }

  return "Only persisted, non-live, unpublished rows can be assigned.";
}

function formatDecision(decision: string | null) {
  return decision
    ? decision
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
    : "Needs review";
}

function formatAuditTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

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
    post.whyItMattersValidationStatus !== "requires_human_rewrite" &&
    !isBlockingDecision(post.editorialDecision)
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

  const blockedDecisionCount = posts.filter(
    (post) =>
      post.persisted &&
      ["draft", "needs_review"].includes(post.editorialStatus) &&
      isBlockingDecision(post.editorialDecision),
  ).length;

  if (blockedDecisionCount > 0) {
    return `${blockedDecisionCount} signal posts have rejected, held, or rewrite-requested editorial decisions.`;
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

function getComposerPublishDisabledReason(
  readiness: FinalSlateReadinessResult,
  storageReady: boolean,
  auditStorageReady: boolean,
): string | null {
  if (!storageReady) {
    return "Publishing is blocked until editorial storage is configured.";
  }

  if (!auditStorageReady) {
    return "Publishing is blocked until published-slate audit storage is configured.";
  }

  if (!readiness.ready) {
    return `Publish is disabled: ${readiness.failures[0]?.message ?? "final slate validation has not passed."}`;
  }

  return null;
}

function getReadyToPublishMessage() {
  return "Ready to publish the validated 5 Core + 2 Context slate.";
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
