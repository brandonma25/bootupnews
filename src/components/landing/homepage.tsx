"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";

import AuthModal from "@/components/auth/auth-modal";
import { isHomepageDebugConfigured } from "@/lib/env";
import {
  buildHomepageViewModel,
  buildOverallNoDataMessage,
  type HomepageCategorySection,
  type HomepageDebugModel,
  type HomepageEvent,
} from "@/lib/homepage-model";
import type { DashboardData, ViewerAccount } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { TrustLayerPresentation } from "@/lib/why-it-matters";
import { cn, formatBriefingDate, minutesToLabel } from "@/lib/utils";

type LandingHomepageProps = {
  data: DashboardData;
  viewer: ViewerAccount | null;
  authState?: string;
  debugEnabled?: boolean;
};

export default function LandingHomepage({
  data,
  viewer,
  authState,
  debugEnabled = false,
}: LandingHomepageProps) {
  const [authModalManuallyOpen, setAuthModalManuallyOpen] = useState(false);
  const [dismissedAuthState, setDismissedAuthState] = useState<string | null>(null);
  const signedIn = Boolean(viewer);
  const currentHash = useHashValue();
  const showDebug = debugEnabled || isHomepageDebugConfigured;

  const { featured, topRanked, categorySections, trending, debug } = useMemo(
    () => buildHomepageViewModel(data),
    [data],
  );
  const sampleEvents = topRanked.slice(1, 2);

  const authMessage = getHomepageAuthMessage(authState);
  const authStateRequestsModal = Boolean(
    authState && authState !== "confirm" && !signedIn && dismissedAuthState !== authState,
  );
  const hashRequestsModal = !signedIn && currentHash === "#email-access";
  const authModalOpen = authModalManuallyOpen || authStateRequestsModal || hashRequestsModal;

  function handleCloseAuthModal() {
    setAuthModalManuallyOpen(false);

    if (authState && authState !== "confirm") {
      setDismissedAuthState(authState);
    }

    if (typeof window !== "undefined" && window.location.hash === "#email-access") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-24 lg:pt-6">
        <HomepageNav
          signedIn={signedIn}
          viewer={viewer}
          onSignIn={() => setAuthModalManuallyOpen(true)}
        />

        <div className="mt-8 space-y-10 lg:mt-10 lg:space-y-14">
          <HeroIntelligenceBlock
            briefingDate={data.briefing.briefingDate}
            mode={data.mode}
            featured={featured}
            sampleCount={Math.min(topRanked.length, 2)}
            onPrimaryAction={() => setAuthModalManuallyOpen(true)}
            signedIn={signedIn}
          />

          <SampleBriefingSection lead={featured} followUps={sampleEvents} signedIn={signedIn} />
          <PreviewTopicsSection sections={categorySections} />
          <UpgradeMomentSection
            signedIn={signedIn}
            onOpenAuth={() => setAuthModalManuallyOpen(true)}
            hiddenCount={Math.max(0, topRanked.length + trending.length - 2)}
          />

          {showDebug ? <HomepageDebugPanel debug={debug} /> : null}

          <DelayedCtaSection
            signedIn={signedIn}
            onOpenAuth={() => setAuthModalManuallyOpen(true)}
          />
        </div>
      </main>

      <AuthModal open={authModalOpen} onClose={handleCloseAuthModal} errorMessage={authMessage} />
    </>
  );
}

function useHashValue() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      window.addEventListener("hashchange", onStoreChange);
      return () => window.removeEventListener("hashchange", onStoreChange);
    },
    () => (typeof window === "undefined" ? "" : window.location.hash),
    () => "",
  );
}

function getHomepageAuthMessage(authState?: string) {
  switch (authState) {
    case "1":
      return null;
    case "oauth-error":
      return "Google sign-in could not be started. Check that Google is enabled in Supabase Auth and that the redirect URL is configured correctly.";
    case "callback-error":
      return "The sign-in callback could not be completed. Try again, and if it persists, verify the Google OAuth redirect URL in Supabase.";
    case "signup-error":
      return "We could not finish account creation. Try Google sign-in again or confirm the current auth provider settings.";
    case "invalid":
      return "That sign-in attempt was not accepted. Try again.";
    default:
      return null;
  }
}

function HomepageNav({
  signedIn,
  viewer,
  onSignIn,
}: {
  signedIn: boolean;
  viewer: ViewerAccount | null;
  onSignIn: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-[rgba(19,26,34,0.08)] bg-[rgba(244,241,234,0.92)] px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-[rgba(244,241,234,0.82)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:py-4">
      <div className="mx-auto flex min-h-[56px] max-w-[1280px] flex-wrap items-center justify-between gap-3 lg:min-h-[64px] lg:flex-nowrap">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="min-w-0">
            <p className="display-font text-[1.25rem] leading-none text-[var(--foreground)] sm:text-[1.4rem]">
              Daily Intelligence
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Intelligence briefing
            </p>
          </Link>
        </div>

        <nav className="hidden items-center gap-5 text-sm font-medium text-[var(--muted)] lg:flex">
          <a href="#top-events" className="transition-colors hover:text-[var(--foreground)]">
            Top Events
          </a>
          <a href="#tech" className="transition-colors hover:text-[var(--foreground)]">
            Tech
          </a>
          <a href="#finance" className="transition-colors hover:text-[var(--foreground)]">
            Finance
          </a>
          <a href="#politics" className="transition-colors hover:text-[var(--foreground)]">
            Politics
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {signedIn && viewer ? (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[var(--foreground)]">{viewer.displayName}</p>
              <p className="text-xs text-[var(--muted)]">Signed in</p>
            </div>
          ) : null}
          {signedIn ? (
            <Link href="/dashboard">
              <Button className="px-5">Get Briefing</Button>
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onSignIn}
                className="text-sm font-semibold text-[var(--foreground)] transition-colors hover:text-[#294f86]"
              >
                Sign in
              </button>
              <Button className="px-5" onClick={onSignIn}>
                Get Briefing
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function HeroIntelligenceBlock({
  briefingDate,
  mode,
  featured,
  sampleCount,
  onPrimaryAction,
  signedIn,
}: {
  briefingDate: string;
  mode: DashboardData["mode"];
  featured: HomepageEvent | null;
  sampleCount: number;
  onPrimaryAction: () => void;
  signedIn: boolean;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-7">
      <div className="relative overflow-hidden rounded-[32px] border border-[rgba(19,26,34,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))] px-6 py-8 shadow-[0_24px_80px_rgba(17,24,39,0.07)] lg:px-8 lg:py-11">
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(135deg,rgba(41,79,134,0.14),rgba(41,79,134,0.02)_62%,transparent)]" />
        <div className="relative max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className="border-[rgba(41,79,134,0.16)] bg-[rgba(41,79,134,0.08)] text-[#294f86]">
              Daily Intelligence Briefing
            </Badge>
            <Badge>{mode === "live" ? "Live mode" : mode === "public" ? "Public mode" : "Demo mode"}</Badge>
            <Badge>{formatBriefingDate(briefingDate)}</Badge>
          </div>
          <h1 className="display-font mt-6 max-w-3xl text-[2.35rem] leading-[1.04] text-[var(--foreground)] sm:text-[3rem] lg:text-[3.45rem]">
            Preview today&apos;s briefing before you unlock the full workspace.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--muted)] sm:text-[17px] sm:leading-8">
            Daily Intelligence Aggregator turns live coverage into ranked events, adds context, and helps you scan what matters fast. This homepage is a sample of that experience, not the full briefing.
          </p>
          <p className="mt-5 text-sm font-medium text-[var(--foreground)]/88">
            See the lead signal here. Use the dashboard for the fuller ranked workflow.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            <SignalPill title="Preview sample" detail={`${sampleCount} sample ${sampleCount === 1 ? "event" : "events"} from the current briefing cycle.`} />
            <SignalPill title="Event-first" detail="Coverage is grouped into developments, not dumped as isolated links." />
            <SignalPill title="Full dashboard" detail="Unlock the complete ranked briefing, deeper cards, and topic navigation." />
          </div>
          {!signedIn ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button className="px-5" onClick={onPrimaryAction}>
                Unlock full briefing
              </Button>
              <p className="text-sm text-[var(--muted)]">
                Start with this public preview, then move into the full dashboard when you are ready.
              </p>
            </div>
          ) : (
            <div className="mt-8 text-sm text-[var(--muted)]">
              You are viewing the public preview. Open the dashboard for the fuller working briefing.
            </div>
          )}
        </div>
      </div>

      <FeaturedEventCard event={featured} onOpenAuth={onPrimaryAction} signedIn={signedIn} />
    </section>
  );
}

function SignalPill({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[20px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.52)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/88">
        {title}
      </p>
      <p className="mt-2 leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function FeaturedEventCard({
  event,
  onOpenAuth,
  signedIn,
}: {
  event: HomepageEvent | null;
  onOpenAuth: () => void;
  signedIn: boolean;
}) {
  return (
    <Panel className="flex h-full flex-col justify-between rounded-[32px] border-[rgba(19,26,34,0.1)] bg-[rgba(255,255,255,0.78)] px-6 py-6 shadow-[0_24px_80px_rgba(17,24,39,0.07)] lg:px-7 lg:py-7">
      {event ? (
        <>
          <EventCard
            event={event}
            variant="featured"
            label="Sample lead event"
            showTimeline
            showRelatedArticles
          />
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Briefing flow</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                The homepage shows a sample of the briefing flow. The dashboard adds the full ranked stack and deeper topic-by-topic coverage.
              </p>
            </div>
            {signedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"
              >
                Open full dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Button variant="secondary" className="px-4" onClick={onOpenAuth}>
                Unlock full briefing
              </Button>
            )}
          </div>
        </>
      ) : (
        <StatusPanel
          title="Coverage unavailable right now"
          body="The lead event will appear here once feeds refresh and the ranking pass has enough coverage to surface a top development."
        />
      )}
    </Panel>
  );
}

function SampleBriefingSection({
  lead,
  followUps,
  signedIn,
}: {
  lead: HomepageEvent | null;
  followUps: HomepageEvent[];
  signedIn: boolean;
}) {
  const noDataMessage = buildOverallNoDataMessage((lead ? 1 : 0) + followUps.length);

  return (
    <section id="top-events" className="space-y-5 lg:space-y-6">
      <SectionHeader
        eyebrow="Sample Briefing"
        title="A limited preview of today&apos;s ranked intelligence"
        description="You can scan the lead event and one follow-up here. The full dashboard expands this into the complete ranked briefing with topic navigation and deeper cards."
      />
      {lead || followUps.length ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            {lead ? (
              <Panel className="h-full rounded-[30px] border-[rgba(19,26,34,0.1)] bg-[rgba(255,255,255,0.76)] p-6 lg:p-7">
                <EventCard
                  event={lead}
                  rank={1}
                  variant="ranked-featured"
                  label="Preview lead"
                  showTimeline
                  showRelatedArticles
                />
              </Panel>
            ) : null}
          </div>
          <div className="space-y-4">
            <Panel className="border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.64)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                What unlocks next
              </p>
              <div className="mt-4 space-y-3">
                {followUps.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      "rounded-[20px] border border-[var(--line)] bg-white/70 p-4",
                      index !== followUps.length - 1 && "mb-3",
                    )}
                  >
                    <EventCard event={event} rank={index + 2} variant="ranked" label="Preview follow-up" />
                  </div>
                ))}
                <PreviewPlaceholderCard />
              </div>
              <div className="mt-5 border-t border-[var(--line)] pt-4">
                {signedIn ? (
                  <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    Open the full dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    The dashboard continues from this sample with the full ranked stack, topic sections, and briefing workflow.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      ) : (
        <StatusPanel title={noDataMessage.title} body={noDataMessage.body} />
      )}
    </section>
  );
}

function PreviewTopicsSection({ sections }: { sections: HomepageCategorySection[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Preview Topics"
        title="A quick look at where the full briefing goes deeper"
        description="The homepage only hints at topic coverage. The dashboard is where the complete event stack and topic-by-topic workflow live."
        compact
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Panel
            key={section.key}
            className="border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)] p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {section.label}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {section.events.length
                ? `${section.events.length} preview ${section.events.length === 1 ? "event" : "events"} surfaced`
                : "Coverage building"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {section.events.length
                ? section.events[0]?.rankingSignals[0] ?? section.description
                : section.emptyReason}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {section.events.slice(0, 2).map((event) => (
                <Badge key={event.id}>{event.topicName}: {event.title.slice(0, 28)}{event.title.length > 28 ? "…" : ""}</Badge>
              ))}
              {!section.events.length ? <Badge>Preview only</Badge> : null}
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

function UpgradeMomentSection({
  signedIn,
  onOpenAuth,
  hiddenCount,
}: {
  signedIn: boolean;
  onOpenAuth: () => void;
  hiddenCount: number;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel className="rounded-[30px] border-[rgba(19,26,34,0.1)] bg-[rgba(255,255,255,0.78)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          What you saw here
        </p>
        <h2 className="display-font mt-3 text-[1.9rem] leading-tight text-[var(--foreground)]">
          A sample, not the whole product
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          The homepage is intentionally limited to a public sample briefing. It shows how the product thinks, but not the full daily workflow.
        </p>
      </Panel>
      <Panel className="rounded-[30px] border-[rgba(41,79,134,0.14)] bg-[linear-gradient(180deg,rgba(41,79,134,0.08),rgba(255,255,255,0.78))] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#294f86]">
          Full dashboard
        </p>
        <h2 className="display-font mt-3 text-[1.9rem] leading-tight text-[var(--foreground)]">
          Unlock the complete ranked briefing
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SignalPill title="More depth" detail="Full event cards, not just preview modules." />
          <SignalPill title="More coverage" detail={`${hiddenCount} more ranked ${hiddenCount === 1 ? "event sits" : "events sit"} beyond this sample.`} />
          <SignalPill title="More workflow" detail="Topic navigation, refresh controls, and the full briefing environment." />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {signedIn ? (
            <Link href="/dashboard">
              <Button className="px-6">Open full dashboard</Button>
            </Link>
          ) : (
            <Button className="px-6" onClick={onOpenAuth}>
              Unlock full briefing
            </Button>
          )}
          <p className="text-sm text-[var(--muted)]">
            The dashboard is where the complete ranked briefing, deeper cards, and topic workflow live.
          </p>
        </div>
      </Panel>
    </section>
  );
}

function EventCard({
  event,
  rank,
  label,
  showTimeline = false,
  showRelatedArticles = false,
  variant,
}: {
  event: HomepageEvent;
  rank?: number;
  label: string;
  showTimeline?: boolean;
  showRelatedArticles?: boolean;
  variant: "featured" | "ranked-featured" | "ranked" | "compact" | "list";
}) {
  const emphatic = variant === "featured" || variant === "ranked-featured";
  const compact = variant === "compact";
  const list = variant === "list";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {rank ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(41,79,134,0.1)] text-[1.15rem] font-semibold text-[#294f86] lg:h-14 lg:w-14 lg:text-[1.35rem]">
              #{rank}
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {label}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{event.topicName}</Badge>
              {event.importanceLabel ? <Badge className="text-[#294f86]">{event.importanceLabel}</Badge> : null}
              {event.matchedKeywords[0] ? <Badge>Matched on {event.matchedKeywords[0]}</Badge> : null}
            </div>
          </div>
        </div>
        {!list && event.rankingSignals[0] ? (
          <span className="max-w-[190px] text-right text-xs font-medium leading-5 text-[var(--muted)]">
            {event.rankingSignals[0]}
          </span>
        ) : null}
      </div>

      <div>
        <h3
          className={cn(
            "font-semibold leading-tight text-[var(--foreground)]",
            emphatic && "text-[1.45rem] lg:text-[1.7rem]",
            variant === "ranked" && "text-[1.2rem]",
            compact && "text-[1.05rem]",
            list && "text-base",
          )}
        >
          {event.title}
        </h3>
        <p
          className={cn(
            "mt-3 text-[var(--muted)]",
            emphatic ? "text-sm leading-7 lg:text-[15px]" : "text-sm leading-6",
          )}
        >
          {event.summary}
        </p>
      </div>

      <WhyItMattersBlock presentation={event.trustLayer} emphatic={emphatic} />

      {showTimeline && event.timeline.length ? <TimelineBlock timeline={event.timeline} /> : null}

      {showRelatedArticles ? (
        <RelatedArticlesList articles={event.relatedArticles} compact={compact || list} />
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
        <MetaPill>{minutesToLabel(event.estimatedMinutes)} read</MetaPill>
        <MetaPill>{event.sourceCount} related sources</MetaPill>
        {event.rankingSignals[1] ? <MetaPill>{event.rankingSignals[1]}</MetaPill> : null}
      </div>
    </div>
  );
}

function WhyItMattersBlock({
  presentation,
  emphatic = false,
}: {
  presentation: TrustLayerPresentation;
  emphatic?: boolean;
}) {
  return (
    <div
      data-trust-tier={presentation.tier}
      className={cn(
        "rounded-[22px] px-4 py-3",
        presentation.tier === "high" &&
          "border border-[rgba(41,79,134,0.14)] bg-[linear-gradient(180deg,rgba(41,79,134,0.08),rgba(41,79,134,0.03))]",
        presentation.tier === "medium" &&
          "border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)]",
        presentation.tier === "low" &&
          "border border-dashed border-[rgba(19,26,34,0.12)] bg-[rgba(255,255,255,0.36)]",
        emphatic && presentation.tier === "high" && "shadow-[0_14px_40px_rgba(41,79,134,0.08)]",
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.18em]",
          presentation.tier === "high" ? "text-[#294f86]" : "text-[var(--muted)]",
        )}
      >
        {presentation.heading}
      </p>
      <p
        className={cn(
          "mt-2",
          presentation.tier === "low"
            ? "text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]"
            : "text-sm leading-7 text-[var(--foreground)]",
        )}
      >
        {presentation.body}
      </p>
      {presentation.supportingSignals.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {presentation.supportingSignals.map((signal) => (
            <span
              key={signal}
              className="inline-flex items-center rounded-full border border-[rgba(19,26,34,0.08)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--muted)]"
            >
              {signal}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TimelineBlock({
  timeline,
}: {
  timeline: Array<{ label: string; detail: string }>;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.58)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        What led to today
      </p>
      <div className="mt-4 space-y-3">
        {timeline.map((milestone) => (
          <div
            key={`${milestone.label}-${milestone.detail}`}
            className="grid grid-cols-[92px_minmax(0,1fr)] gap-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#294f86]">
              {milestone.label}
            </p>
            <p className="text-sm leading-6 text-[var(--foreground)]">{milestone.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedArticlesList({
  articles,
  compact = false,
}: {
  articles: Array<{ title: string; url: string; sourceName: string; note?: string }>;
  compact?: boolean;
}) {
  if (!articles.length) return null;

  return (
    <div className="rounded-[22px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.52)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Related coverage
      </p>
      <div className="mt-3 space-y-2.5">
        {articles.map((article) => (
          <a
            key={`${article.sourceName}-${article.url}-${article.title}`}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start justify-between gap-3 rounded-[16px] border border-[rgba(19,26,34,0.06)] bg-white/70 px-3 py-3 transition-colors hover:bg-white"
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "font-semibold text-[var(--foreground)]",
                  compact ? "text-sm leading-5" : "text-sm leading-6",
                )}
              >
                {article.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {article.sourceName}
                {article.note ? ` • ${article.note}` : ""}
              </p>
            </div>
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          </a>
        ))}
      </div>
    </div>
  );
}

function DelayedCtaSection({
  signedIn,
  onOpenAuth,
}: {
  signedIn: boolean;
  onOpenAuth: () => void;
}) {
  return (
    <Panel className="rounded-[32px] border-[rgba(19,26,34,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.72))] px-6 py-7 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Daily briefing access
          </p>
          <h2 className="display-font mt-3 text-[2rem] leading-tight text-[var(--foreground)] sm:text-[2.35rem]">
            Get your daily intelligence briefing
          </h2>
          <p className="mt-3 text-base leading-8 text-[var(--muted)]">
            Track the most important developments with context, prioritization, and less noise.
          </p>
        </div>
        {signedIn ? (
          <Link href="/dashboard">
            <Button className="px-6">Get Briefing</Button>
          </Link>
        ) : (
          <Button className="px-6" onClick={onOpenAuth}>
            Get Briefing
          </Button>
        )}
      </div>
    </Panel>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", compact && "max-w-2xl")}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-2 font-semibold tracking-tight text-[var(--foreground)]",
          compact ? "text-[1.45rem]" : "text-[1.8rem] lg:text-[2rem]",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-2 text-[var(--muted)]",
          compact ? "text-sm leading-7" : "text-sm leading-7 lg:text-[15px]",
        )}
      >
        {description}
      </p>
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.72)] px-3 py-1.5">
      {children}
    </span>
  );
}

function PreviewPlaceholderCard() {
  return (
    <div className="rounded-[20px] border border-dashed border-[rgba(19,26,34,0.12)] bg-[rgba(255,255,255,0.45)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Dashboard-only depth
      </p>
      <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">
        More ranked events continue in the full briefing
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Topic sections, additional events, and the fuller workflow live in the dashboard rather than on the public homepage.
      </p>
    </div>
  );
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2">{body}</p>
    </Panel>
  );
}

function HomepageDebugPanel({ debug }: { debug: HomepageDebugModel }) {
  return (
    <Panel className="rounded-[28px] border-[rgba(19,26,34,0.1)] bg-[rgba(255,255,255,0.78)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Homepage debug
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DebugStat label="Articles fetched" value={formatDebugValue(debug.totalArticlesFetched)} />
        <DebugStat label="Candidate events" value={formatDebugValue(debug.totalCandidateEvents)} />
        <DebugStat label="Ranked events" value={String(debug.rankedEventsCount)} />
        <DebugStat label="Uncategorized events" value={String(debug.uncategorizedEventsCount)} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <DebugList
          title="Category counts"
          rows={[
            `Tech: ${debug.categoryCounts.tech}`,
            `Finance: ${debug.categoryCounts.finance}`,
            `Politics: ${debug.categoryCounts.politics}`,
          ]}
        />
        <DebugList
          title="Source counts by category"
          rows={[
            `Tech sources: ${debug.sourceCountsByCategory.tech}`,
            `Finance sources: ${debug.sourceCountsByCategory.finance}`,
            `Politics sources: ${debug.sourceCountsByCategory.politics}`,
          ]}
        />
        <DebugList
          title="Last successful runs"
          rows={[
            `Last fetch time: ${debug.lastSuccessfulFetchTime ?? "Unknown"}`,
            `Last ranking run: ${debug.lastRankingRunTime ?? "Unknown"}`,
          ]}
        />
        <DebugList
          title="Why a section is empty"
          rows={[
            `Tech: ${debug.categoryEmptyReasons.tech}`,
            `Finance: ${debug.categoryEmptyReasons.finance}`,
            `Politics: ${debug.categoryEmptyReasons.politics}`,
          ]}
        />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <DebugList title="Tech exclusions" rows={debug.categoryExclusionReasons.tech} />
        <DebugList title="Finance exclusions" rows={debug.categoryExclusionReasons.finance} />
        <DebugList title="Politics exclusions" rows={debug.categoryExclusionReasons.politics} />
      </div>
    </Panel>
  );
}

function DebugStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.54)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function DebugList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-[20px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.54)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {title}
      </p>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground)]">
        {rows.length ? rows.map((row) => <p key={row}>{row}</p>) : <p>No exclusions recorded.</p>}
      </div>
    </div>
  );
}

function formatDebugValue(value: number | null) {
  return value === null ? "Unknown" : String(value);
}
