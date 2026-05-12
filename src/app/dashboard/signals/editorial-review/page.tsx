import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Lock, ShieldAlert } from "lucide-react";

import { EditorialComposerClient } from "@/components/admin/editorial-composer/EditorialComposerClient";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  validateFinalSlateReadiness,
  type FinalSlateReadinessResult,
} from "@/lib/final-slate-readiness";
import {
  SIGNALS_EDITORIAL_ROUTE,
  getEditorialReviewState,
  sortEditorialHistoryPostsReverseChronological,
  type EditorialSignalPost,
} from "@/lib/signals-editorial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Boot Up — Editorial composer",
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
  const resolvedSearchParams = await (searchParams ? searchParams : Promise.resolve(undefined));
  const successMessage = readSingleParam(resolvedSearchParams?.success);
  const errorMessage = readSingleParam(resolvedSearchParams?.error);
  const state = await getEditorialReviewState(SIGNALS_EDITORIAL_ROUTE, {
    scope: "current",
    status: "all",
  });

  if (state.kind === "unauthenticated") {
    return (
      <AccessState
        title="Admin sign-in required"
        detail="Sign in with an authorized Google account to review Signals."
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
        detail={`${state.userEmail ?? "This account"} does not have admin/editor access for Signals.`}
        badge="Unauthorized"
        href="/"
        cta="Return home"
      />
    );
  }

  const candidates = getCurrentCandidatePool(state.currentCandidates, state.posts);
  const finalSlateReadiness = validateFinalSlateReadiness(candidates);
  const publishDisabledReason = getComposerPublishDisabledReason(
    finalSlateReadiness,
    state.storageReady,
    state.auditStorageReady,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-[var(--bu-container-wide)] px-4 py-[var(--bu-space-5)] md:px-6">
      <div className="space-y-[var(--bu-space-5)]">
        <header className="border-b border-[var(--bu-border-subtle)] pb-[var(--bu-space-5)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">Admin/editor only</p>
              <h1 className="mt-2 text-[var(--bu-size-page-title)] font-medium leading-tight text-[var(--bu-text-primary)]">
                Editorial composer
              </h1>
              <p className="mt-2 max-w-2xl text-[var(--bu-size-ui)] leading-6 text-[var(--bu-text-secondary)]">
                Compose the final public slate from reviewed candidates.
              </p>
            </div>
            <p className="text-[var(--bu-size-meta)] text-[var(--bu-text-tertiary)]">
              {state.latestBriefingDate ? `Current set ${state.latestBriefingDate}` : "Current set"} · {state.adminEmail}
            </p>
          </div>
        </header>

        {successMessage ? <StatusBanner tone="success" message={successMessage} /> : null}
        {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}
        {state.warning ? <StatusBanner tone="warning" message={state.warning} /> : null}
        {state.auditWarning ? <StatusBanner tone="warning" message={state.auditWarning} /> : null}

        <EditorialComposerClient
          candidates={candidates}
          storageReady={state.storageReady}
          auditStorageReady={state.auditStorageReady}
          publishDisabledReason={publishDisabledReason}
        />
      </div>
    </main>
  );
}

function getCurrentCandidatePool(
  currentCandidates: EditorialSignalPost[],
  posts: EditorialSignalPost[],
) {
  const candidates = currentCandidates.length
    ? currentCandidates
    : sortEditorialHistoryPostsReverseChronological(posts);

  return candidates.slice().sort((left, right) => left.rank - right.rank);
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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-[var(--bu-bg-subtle)]">
            <Lock className="h-5 w-5 text-[var(--bu-text-primary)]" />
          </span>
          <div className="space-y-3">
            <p className="section-label">{badge}</p>
            <h1 className="text-2xl font-medium tracking-normal text-[var(--bu-text-primary)]">
              {title}
            </h1>
            <p className="text-base leading-7 text-[var(--bu-text-secondary)]">{detail}</p>
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
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--bu-text-primary)]" />
        <p className="text-sm leading-6 text-[var(--bu-text-secondary)]">{message}</p>
      </div>
    </Panel>
  );
}
