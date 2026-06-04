"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { CategoryNavigation } from "@/components/home/CategoryNavigation";
import { MvpMeasurementTracker } from "@/components/mvp-measurement/MvpMeasurementTracker";
import { DateBadge } from "@/components/signals/DateBadge";
import { Panel } from "@/components/ui/panel";
import {
  buildOverallNoDataMessage,
  selectHomepageTopEvents,
  type HomepageViewModel,
} from "@/lib/homepage-model";
import type { DashboardData, ViewerAccount } from "@/lib/types";
import { getBriefingDateKey } from "@/lib/utils";

type LandingHomepageData = {
  mode: DashboardData["mode"];
  briefing: {
    briefingDate: string;
  };
  homepageFreshnessNotice?: DashboardData["homepageFreshnessNotice"];
  publicRankedSignalCount?: number;
};

type LandingHomepageProps = {
  data: LandingHomepageData;
  viewer: ViewerAccount | null;
  isAdmin?: boolean;
  authState?: string;
  debugEnabled?: boolean;
  homepageViewModel: HomepageViewModel;
  /**
   * Top Signal Cards, pre-rendered by the server route as RSC payload. Passing
   * them in (rather than mapping <SignalCard> here) keeps the heavy editorial
   * card content from hydrating inside this client shell. See PR perf/defer-
   * signalcard-hydration.
   */
  signalCards: ReactNode;
};

export default function LandingHomepage({
  data,
  viewer,
  isAdmin = false,
  authState,
  debugEnabled = false,
  homepageViewModel,
  signalCards,
}: LandingHomepageProps) {
  const { debug } = homepageViewModel;
  const topEventCount = selectHomepageTopEvents(homepageViewModel).length;
  const briefingDateKey = getBriefingDateKey(data.briefing.briefingDate);
  const publicRankedSignalCount = data.publicRankedSignalCount ?? homepageViewModel.debug.rankedEventsCount;
  const noDataMessage = buildOverallNoDataMessage(topEventCount);
  const topEventsEmptyMessage =
    data.homepageFreshnessNotice?.kind === "empty"
      ? { title: data.homepageFreshnessNotice.text, body: "" }
      : noDataMessage;
  const authMessage = getHomepageAuthMessage(authState);

  return (
    <AppShell currentPath="/" mode={data.mode} account={viewer} isAdmin={isAdmin}>
      <MvpMeasurementTracker
        pageView={{
          eventName: "homepage_view",
          route: "/",
          surface: "home",
          briefingDate: briefingDateKey,
          metadata: {
            visibleSignalCount: topEventCount,
            publicRankedSignalCount,
            coreSignalCount: homepageViewModel.debug.coreSignalCount,
            contextSignalCount: homepageViewModel.debug.contextSignalCount,
            rendersCoreAndContext: homepageViewModel.debug.coreSignalCount >= 5 && homepageViewModel.debug.contextSignalCount >= 2,
          },
        }}
      />
      <div className="mx-auto w-full max-w-[var(--bu-container-narrow)] px-[var(--bu-space-2)] py-[var(--bu-space-7)] md:px-0">
        {authMessage ? (
          <Panel className="mb-[var(--bu-space-5)] p-4" role="alert">
            <p className="text-sm font-medium text-[var(--bu-text-primary)]">{authMessage}</p>
            <Link
              href="/login"
              className="mt-2 inline-flex text-sm font-medium text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-accent)]"
            >
              Return to login
            </Link>
          </Panel>
        ) : null}

        <CategoryNavigation className="mb-[var(--bu-space-6)]" />

        <header className="mb-[var(--bu-space-6)] flex items-baseline justify-between gap-4">
          <DateBadge date={parseBriefingDate(data.briefing.briefingDate)} />
          <h1 className="text-[var(--bu-size-meta)] font-medium uppercase tracking-[0.08em] text-[var(--bu-text-tertiary)]">
            Today&apos;s signals
          </h1>
        </header>

        {data.homepageFreshnessNotice ? (
          <Panel className="mb-[var(--bu-space-5)] p-4" data-testid="home-freshness-notice">
            <p className="text-sm font-medium text-[var(--bu-text-primary)]">
              {data.homepageFreshnessNotice.text}
            </p>
          </Panel>
        ) : null}

        {topEventCount ? (
          <div className="grid gap-[var(--bu-space-3)]">{signalCards}</div>
        ) : (
          <StatusPanel title={topEventsEmptyMessage.title} body={topEventsEmptyMessage.body} />
        )}

        {debugEnabled ? (
          <Panel className="mt-[var(--bu-space-5)] p-5">
            <p className="section-label">Homepage diagnostics</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <DebugStat label="Ranked events" value={debug.rankedEventsCount} />
              <DebugStat label="Tech" value={debug.categoryCounts.tech} />
              <DebugStat label="Finance" value={debug.categoryCounts.finance} />
              <DebugStat label="Politics" value={debug.categoryCounts.politics} />
            </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}

function parseBriefingDate(value: string) {
  const dateKey = getBriefingDateKey(value);
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function StatusPanel({ title, body }: { title: string; body?: string }) {
  return (
    <Panel className="p-5 text-base text-[var(--text-secondary)]">
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      {body ? <p className="mt-2">{body}</p> : null}
    </Panel>
  );
}

function DebugStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="section-label">{label}</p>
      <p className="mt-2 text-xl font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function getHomepageAuthMessage(authState?: string) {
  switch (authState) {
    case "oauth-error":
      return "Google sign-in could not be started. Check the auth provider configuration and try again.";
    case "callback-error":
      return "The sign-in callback could not be completed. Try signing in again.";
    case "signup-error":
      return "We could not finish account creation. Try again.";
    case "invalid":
      return "That sign-in attempt was not accepted. Try again.";
    case "config-error":
      return "Authentication is not configured for this environment yet.";
    default:
      return null;
  }
}
