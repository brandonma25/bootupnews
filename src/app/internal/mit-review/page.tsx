import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, ExternalLink, Lock, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  MIT_INTERNAL_REVIEW_ROUTE,
  collectMitInternalReviewData,
  type MitReviewItem,
} from "@/lib/internal/mit-review";
import { safeGetUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "MIT Review - Internal",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MitReviewPage() {
  const { user } = await safeGetUser(MIT_INTERNAL_REVIEW_ROUTE);

  if (!user) {
    return <LockedInternalPage />;
  }

  const data = await collectMitInternalReviewData();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-6">
      <div className="space-y-5">
        <header className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Internal review</Badge>
            <Badge className="text-[var(--text-primary)]">Noindex</Badge>
            <Badge className="text-[var(--text-primary)]">MIT probationary runtime source</Badge>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-2xl font-medium tracking-normal text-[var(--text-primary)] md:text-3xl">
                MIT probationary review
              </h1>
              <p className="text-base leading-7 text-[var(--text-secondary)]">
                Compact internal evidence for reviewing MIT Technology Review signal quality without changing source activation,
                MVP defaults, donor defaults, or source-policy boosts.
              </p>
            </div>
            <Button as="a" href={data.issue.url} target="_blank" rel="noreferrer" variant="secondary" className="gap-2">
              Issue #70
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusPanel
            label="Probationary runtime"
            value={data.runtime.mitIsOnlyProbationaryRuntimeSource ? "MIT only" : "Needs review"}
            tone={data.runtime.mitIsOnlyProbationaryRuntimeSource ? "ok" : "warn"}
            detail={`Configured IDs: ${formatIdList(data.runtime.probationaryRuntimeSourceIds)}`}
          />
          <StatusPanel
            label="Resolution snapshot"
            value={data.runtime.noArgumentResolutionObserved ? "Observed" : "Not confirmed"}
            tone={data.runtime.noArgumentResolutionObserved ? "ok" : "warn"}
            detail={`Resolved probationary IDs: ${formatIdList(data.runtime.resolvedProbationarySourceIds)}`}
          />
          <StatusPanel
            label="MIT feed sample"
            value={data.feed.reachable ? `${data.feed.sampleItemCount} shown` : "Unavailable"}
            tone={data.feed.reachable ? "ok" : "warn"}
            detail={data.feed.reachable ? `${data.feed.observedItemCount} items observed in this request` : data.feed.fetchErrorSummary ?? "Fetch failed"}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <Panel className="p-5">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="section-label">Recent MIT feed sample</p>
                <h2 className="mt-1 text-lg font-medium text-[var(--text-primary)]">Top MIT item titles</h2>
              </div>
              <Badge>{data.feed.sourceId}</Badge>
            </div>
            {data.feed.topItems.length > 0 ? (
              <ol className="mt-4 divide-y divide-[var(--border)]">
                {data.feed.topItems.map((item, index) => (
                  <MitItemRow key={`${item.title}-${index}`} item={item} index={index} />
                ))}
              </ol>
            ) : (
              <div className="mt-4 rounded-card border border-dashed border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">No MIT items available</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  The current request could not show a feed sample. Check Issue #70 and rerun after the upstream feed is reachable.
                </p>
              </div>
            )}
          </Panel>

          <Panel className="p-5">
            <p className="section-label">Signal-quality sample</p>
            <div className="mt-3 space-y-4">
              <Metric label="Automatic judgment" value={data.review.signalQualityJudgment} />
              <Metric label="High-signal top items" value={`${data.review.highSignalTopItemCount}`} />
              <Metric label="Noise flags" value={`${data.review.noisyTopItemCount}`} />
              <Metric label="Default comparison feeds" value={`${data.review.baselineComparisonFeedCount}`} />
              <Metric label="Comparison fetch failures" value={`${data.review.baselineFetchFailureCount}`} />
            </div>
            <div className="mt-5 rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">Contribution usefulness</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{data.review.contributionUsefulness}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{data.review.duplicationNoiseNotes}</p>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <NotesPanel title="What this proves" items={data.proves} />
          <NotesPanel title="What this does not prove" items={data.doesNotProve} />
          <NotesPanel title="Safety boundary" items={data.safetyNotes} />
        </section>

        <Panel className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="section-label">Review history</p>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{data.issue.note}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Checked at {new Date(data.checkedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}.
              </p>
            </div>
            <Badge className="shrink-0 text-[var(--text-primary)]">Internal surface, not a public product feature</Badge>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function LockedInternalPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Panel className="w-full p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-[var(--sidebar)]">
            <Lock className="h-5 w-5 text-[var(--text-primary)]" />
          </span>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>Internal review</Badge>
              <Badge>No evidence exposed</Badge>
            </div>
            <h1 className="text-2xl font-medium tracking-normal text-[var(--text-primary)]">
              Internal access required
            </h1>
            <p className="text-base leading-7 text-[var(--text-secondary)]">
              This route is reserved for authenticated internal MIT probationary review. Public requests do not receive
              source-resolution evidence, feed samples, review history, or operational details.
            </p>
            <Button as="a" href="/login" variant="secondary">
              Sign in
            </Button>
          </div>
        </div>
      </Panel>
    </main>
  );
}

function StatusPanel({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "ok" | "warn";
}) {
  const Icon = tone === "ok" ? CheckCircle2 : AlertTriangle;

  return (
    <Panel className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-[var(--sidebar)]">
          <Icon className="h-4 w-4 text-[var(--text-primary)]" />
        </span>
        <div className="min-w-0">
          <p className="section-label">{label}</p>
          <p className="mt-1 text-lg font-medium text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
        </div>
      </div>
    </Panel>
  );
}

function MitItemRow({ item, index }: { item: MitReviewItem; index: number }) {
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr_auto] sm:items-start">
      <span className="flex h-8 w-8 items-center justify-center rounded-card bg-[var(--sidebar)] text-sm font-medium text-[var(--text-primary)]">
        {index + 1}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-medium leading-6 text-[var(--text-primary)]">{item.title}</h3>
        {item.summarySnippet ? (
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.summarySnippet}</p>
        ) : null}
      </div>
      <Badge className="w-fit text-[var(--text-primary)]">{item.freshnessLabel}</Badge>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function NotesPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--text-primary)]" />
        <h2 className="text-base font-medium text-[var(--text-primary)]">{title}</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-[var(--text-secondary)]">
            {item}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function formatIdList(ids: string[]) {
  if (ids.length === 0) return "none";

  return ids.join(", ");
}
