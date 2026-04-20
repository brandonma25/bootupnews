"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";

import AuthModal from "@/components/auth/auth-modal";
import { BriefingCardCategory } from "@/components/home/BriefingCardCategory";
import { CategoryTabStrip } from "@/components/home/CategoryTabStrip";
import { GuestValuePreview } from "@/components/guest-value-preview";
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
import { cn, formatBriefingDate, minutesToLabel } from "@/lib/utils";
import {
  buildPersonalizationSummary,
  buildPersonalizationTopicOptions,
  getStoredPersonalizationPayload,
  hasActivePersonalization,
  parsePersonalizationProfile,
  subscribeToPersonalizationStore,
} from "@/lib/personalization";

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
  const personalizationPayload = useSyncExternalStore(
    subscribeToPersonalizationStore,
    getStoredPersonalizationPayload,
    () => "",
  );
  const personalizationProfile = useMemo(
    () => (signedIn ? parsePersonalizationProfile(personalizationPayload, viewer?.email) : null),
    [personalizationPayload, signedIn, viewer?.email],
  );
  const personalizationActive = signedIn && hasActivePersonalization(personalizationProfile);

  const { featured, topRanked, categorySections, trending, earlySignals, debug } = useMemo(
    () => buildHomepageViewModel(data, personalizationProfile),
    [data, personalizationProfile],
  );
  const personalizationSummary = buildPersonalizationSummary(personalizationProfile);
  const trackedTopics = personalizationActive
    ? buildPersonalizationTopicOptions(data.topics, data.briefing.items)
        .filter(
          (topic) =>
            personalizationProfile?.followedTopicIds.includes(topic.id) ||
            personalizationProfile?.followedTopicNames.includes(topic.label),
        )
        .map((topic) => topic.label)
        .slice(0, 4)
    : [];
  const followedEntities = personalizationActive
    ? (personalizationProfile?.followedEntities ?? []).slice(0, 4)
    : [];

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
        <SessionStateBanner
          signedIn={signedIn}
          viewer={viewer}
          onSignIn={() => setAuthModalManuallyOpen(true)}
        />

        <div className="mt-8 space-y-10 lg:mt-10 lg:space-y-14">
          <HeroIntelligenceBlock
            briefingDate={data.briefing.briefingDate}
            mode={data.mode}
            featured={featured}
            onPrimaryAction={() => setAuthModalManuallyOpen(true)}
            signedIn={signedIn}
          />

          {personalizationActive ? (
            <Panel className="border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.68)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Personalized ranking
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                    This homepage is tuned to your tracked priorities
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                    {personalizationSummary}. Matching confirmed events can surface a little earlier for you, while the core quality floor remains unchanged.
                  </p>
                </div>
                <Link
                  href="/settings#account-settings"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
                >
                  Adjust preferences
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {trackedTopics.map((topic) => (
                  <Badge key={topic} className="text-[#294f86]">
                    Tracking {topic}
                  </Badge>
                ))}
                {followedEntities.map((entity) => (
                  <Badge key={entity} className="text-[#294f86]">
                    Following {entity}
                  </Badge>
                ))}
              </div>
            </Panel>
          ) : null}

          <HomeCategoryTabsSection topRanked={topRanked} categorySections={categorySections} />

          <TrendingSection events={trending} />

          <EarlySignalsSection events={earlySignals} />

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
    case "config-error":
      return "Authentication is not configured for this environment yet. Add the public Supabase URL and anon key, then try again.";
    default:
      return null;
  }
}

function SessionStateBanner({
  signedIn,
  viewer,
  onSignIn,
}: {
  signedIn: boolean;
  viewer: ViewerAccount | null;
  onSignIn: () => void;
}) {
  return (
    <section className="mt-5">
      <Panel className={cn("p-4 sm:p-5", signedIn ? "border-[rgba(31,79,70,0.18)]" : "border-[rgba(19,26,34,0.08)]")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Session state
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {signedIn ? `Signed in as ${viewer?.displayName}` : "Signed out in public briefing mode"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {signedIn
                ? "Your account session is active, and refreshes should keep you in the personalized workspace."
                : "You can browse the public homepage, but topics, sources, history, and personalization stay behind sign-in."}
            </p>
          </div>
          {signedIn ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard">
                <Button className="px-5">Open dashboard</Button>
              </Link>
              <Link href="/settings#account-settings">
                <Button variant="secondary" className="px-5">Account settings</Button>
              </Link>
            </div>
          ) : (
            <Button className="px-5" onClick={onSignIn}>
              Sign in to unlock your workspace
            </Button>
          )}
        </div>
      </Panel>
    </section>
  );
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
          ) : (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[var(--foreground)]">You&apos;re viewing the public briefing</p>
              <p className="text-xs text-[var(--muted)]">Sign in to personalize your intelligence</p>
            </div>
          )}
          {signedIn ? (
            <Link href="/dashboard">
              <Button className="px-5">Open Briefing</Button>
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
                Personalize briefing
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
  onPrimaryAction,
  signedIn,
}: {
  briefingDate: string;
  mode: DashboardData["mode"];
  featured: HomepageEvent | null;
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
            <Badge>{signedIn ? (mode === "live" ? "Personalized briefing" : "Briefing preview") : "Public briefing"}</Badge>
            <Badge>{formatBriefingDate(briefingDate)}</Badge>
          </div>
          <h1 className="display-font mt-6 max-w-3xl text-[2.35rem] leading-[1.04] text-[var(--foreground)] sm:text-[3rem] lg:text-[3.45rem]">
            Preview a structured intelligence briefing before you unlock the full workspace.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--muted)] sm:text-[17px] sm:leading-8">
            Daily Intelligence Aggregator turns scattered coverage into a structured intelligence briefing with confirmed events, visible ranking logic, and clearly separated early signals. This homepage stays public-facing while the dashboard unlocks the full workflow.
          </p>
          <p className="mt-5 text-sm font-medium text-[var(--foreground)]/88">
            This page shows the event-first product logic without dropping you into the full signed-in workspace.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            <SignalPill title="Public preview" detail="You can scan the event-first briefing before you create an account." />
            <SignalPill title="Transparent ranking" detail="Impact, source breadth, and recency stay visible on every event." />
            <SignalPill title="Noise controlled" detail="Single-source items are separated into Early Signals instead of crowding Top Events." />
          </div>
          {!signedIn ? (
            <div className="mt-8 space-y-4">
              <GuestValuePreview compact ctaLabel="Unlock full briefing" />
              <p className="text-sm text-[var(--muted)]">
                Browse the public briefing first, then sign in when you want personalized topics, saved history, and the full dashboard workflow.
              </p>
            </div>
          ) : (
            <div className="mt-8 text-sm text-[var(--muted)]">
              Your homepage below is structured as ranked events with grouped supporting coverage.
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
            label="Most important now"
            showRelatedArticles
          />
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Briefing flow</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Lead event first, ranked developments next, then secondary event coverage.
              </p>
            </div>
            {signedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"
              >
                Open briefing
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Button variant="secondary" className="px-4" onClick={onOpenAuth}>
                Get Briefing
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

function HomeCategoryTabsSection({
  topRanked,
  categorySections,
}: {
  topRanked: HomepageEvent[];
  categorySections: HomepageCategorySection[];
}) {
  const noDataMessage = buildOverallNoDataMessage(topRanked.length);

  return (
    <section id="top-events" className="space-y-5 lg:space-y-6">
      <SectionHeader
        eyebrow="Top Events"
        title="Confirmed developments, ranked with transparent logic"
        description="Use the tabs to move between the ranked lead set and category-specific developments already derived by the homepage model."
      />
      <CategoryTabStrip
        topEvents={topRanked}
        categorySections={categorySections}
        topEventsEmptyState={<StatusPanel title={noDataMessage.title} body={noDataMessage.body} />}
        renderTopEvent={(event, index) => (
          <Panel
            className={cn(
              "h-full border-[rgba(19,26,34,0.1)] bg-[rgba(255,255,255,0.76)] p-5 transition-transform duration-150 hover:-translate-y-0.5",
              index === 0 && "rounded-[30px] p-6 lg:p-7",
            )}
          >
            <EventCard
              event={event}
              rank={index + 1}
              variant={index === 0 ? "ranked-featured" : "ranked"}
              label="Confirmed event"
              showRelatedArticles
            />
          </Panel>
        )}
        renderCategoryEvent={(event) => (
          <BriefingCardCategory
            item={{
              title: event.title,
              whatHappened: event.whatHappened,
              matchedKeywords: event.matchedKeywords,
            }}
          />
        )}
      />
    </section>
  );
}

function TrendingSection({ events }: { events: HomepageEvent[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Watchlist"
        title="Other confirmed events worth keeping in view"
        description="This is the lower-priority watchlist once the top event layer is clear. It stays compact on purpose."
        compact
      />
      {events.length ? (
        <Panel className="overflow-hidden border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)] p-0">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={cn("px-5 py-5", index !== events.length - 1 && "border-b border-[var(--line)]")}
            >
              <EventCard event={event} variant="list" label="Confirmed event" showRelatedArticles />
            </div>
          ))}
        </Panel>
      ) : (
        <StatusPanel
          title="No additional confirmed events yet"
          body="Once more multi-source clusters qualify, they will collect here in a compact watchlist."
        />
      )}
    </section>
  );
}

function EarlySignalsSection({ events }: { events: HomepageEvent[] }) {
  if (!events.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Early Signals"
        title="Single-source developments kept separate from Top Events"
        description="These items stay visible for awareness, but they do not qualify for the lead ranking until more coverage confirms the event cluster."
        compact
      />
      <div className="grid gap-4 md:grid-cols-3">
        {events.map((event) => (
          <Panel
            key={event.id}
            className="border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)] p-5"
          >
            <EventCard event={event} variant="compact" label="Early signal" showRelatedArticles />
          </Panel>
        ))}
      </div>
    </section>
  );
}

function EventCard({
  event,
  rank,
  label,
  showRelatedArticles = false,
  variant,
}: {
  event: HomepageEvent;
  rank?: number;
  label: string;
  showRelatedArticles?: boolean;
  variant: "featured" | "ranked-featured" | "ranked" | "compact" | "list";
}) {
  const emphatic = variant === "featured" || variant === "ranked-featured";
  const compact = variant === "compact";
  const list = variant === "list";
  const intelligence = event.intelligence;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
            <div className="mt-2 flex max-w-full flex-wrap items-center gap-2">
              <Badge>{event.topicName}</Badge>
              {event.personalization.active ? <Badge className="text-[#294f86]">Higher for you</Badge> : null}
              <Badge className={intelligence.isEarlySignal ? "text-[#8a5a11]" : "text-[#294f86]"}>
                {intelligence.isEarlySignal ? "Early Signal" : "Confirmed Event"}
              </Badge>
              <Badge>{intelligence.timelineIndicator}</Badge>
              <ConfidenceBadge tone={intelligence.confidenceTone} label={intelligence.confidenceLabel} />
            </div>
          </div>
        </div>
        <div className="rounded-[18px] border border-[rgba(19,26,34,0.08)] bg-white/65 px-3 py-3 text-left md:max-w-[220px] md:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Ranking reason
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-[var(--foreground)]">
            {event.whyThisIsHere}
          </p>
          {event.personalization.active && event.personalization.shortReason ? (
            <p className="mt-2 text-xs leading-5 text-[#294f86]">Higher for you: {event.personalization.shortReason}</p>
          ) : null}
        </div>
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

      <SignalStrip event={event} />

      <WhyItMattersBlock
        text={event.whyItMatters}
        whyThisIsHere={event.whyThisIsHere}
        emphatic={emphatic}
      />

      {event.intelligence.keyEntities.length ? (
        <EntityBlock entities={event.intelligence.keyEntities} />
      ) : null}

      {showRelatedArticles ? (
        <RelatedArticlesList
          articles={event.relatedArticles}
          compact={compact || list}
          sourceLabel={event.intelligence.sourceLabel}
        />
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
        <MetaPill>{minutesToLabel(event.estimatedMinutes)} read</MetaPill>
        <MetaPill>{event.intelligence.sourceLabel}</MetaPill>
        <MetaPill>{event.intelligence.impactLabel}</MetaPill>
        <MetaPill>{event.intelligence.recencyLabel}</MetaPill>
      </div>
    </div>
  );
}

function SignalStrip({ event }: { event: HomepageEvent }) {
  return (
    <div className="rounded-[22px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.58)] px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <MetaPill>{event.intelligence.impactLabel}</MetaPill>
        <MetaPill>{event.intelligence.sourceLabel}</MetaPill>
        <MetaPill>{event.intelligence.recencyLabel}</MetaPill>
      </div>
      {event.rankingSignals.length ? (
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{event.rankingSignals[0]}</p>
      ) : null}
    </div>
  );
}

function ConfidenceBadge({
  tone,
  label,
}: {
  tone: HomepageEvent["intelligence"]["confidenceTone"];
  label: string;
}) {
  const className =
    tone === "high"
      ? "text-[var(--accent)]"
      : tone === "medium"
        ? "text-[#294f86]"
        : "text-[#8a5a11]";

  return <Badge className={className}>{label}</Badge>;
}

function EntityBlock({ entities }: { entities: string[] }) {
  return (
    <div className="rounded-[22px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.52)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Key entities
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {entities.map((entity) => (
          <span
            key={entity}
            className="inline-flex max-w-full items-center rounded-full border border-[rgba(19,26,34,0.08)] bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] break-words"
          >
            {entity}
          </span>
        ))}
      </div>
    </div>
  );
}

function WhyItMattersBlock({
  text,
  whyThisIsHere,
  emphatic = false,
}: {
  text: string;
  whyThisIsHere: string;
  emphatic?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border-l-2 border-[#294f86] bg-[rgba(41,79,134,0.05)] px-4 py-3",
        emphatic &&
          "border border-[rgba(41,79,134,0.14)] bg-[linear-gradient(180deg,rgba(41,79,134,0.08),rgba(41,79,134,0.03))]",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#294f86]">Why it matters</p>
      <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{text}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Why this ranks here
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{whyThisIsHere}</p>
    </div>
  );
}

function RelatedArticlesList({
  articles,
  compact = false,
  sourceLabel,
}: {
  articles: Array<{ title: string; url: string; sourceName: string; note?: string }>;
  compact?: boolean;
  sourceLabel: string;
}) {
  if (!articles.length) return null;

  return (
    <div className="rounded-[22px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.52)] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Supporting coverage
        </p>
        <p className="text-xs font-medium text-[var(--muted)]">{sourceLabel}</p>
      </div>
      <div className="mt-3 space-y-2.5">
        {articles.map((article) => (
          <a
            key={`${article.sourceName}-${article.url}-${article.title}`}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col gap-2 rounded-[16px] border border-[rgba(19,26,34,0.06)] bg-white/70 px-3 py-3 transition-colors hover:bg-white sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "break-words font-semibold text-[var(--foreground)]",
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
        <DebugStat label="Surface duplicates" value={String(debug.surfacedDuplicateCount)} />
        <DebugStat label="Semantic suppressions" value={String(debug.semanticDuplicateSuppressedCount)} />
        <DebugStat label="Hidden timelines" value={String(debug.hiddenLowQualityTimelineSignalsCount)} />
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
          title="Ingestion reliability"
          rows={[
            `Failed sources this run: ${debug.failedSourceCount}`,
            `Fallback sources used: ${debug.fallbackSourceCount}`,
            debug.degradedSourceNames.length
              ? `Degraded sources: ${debug.degradedSourceNames.join(", ")}`
              : "Degraded sources: none",
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
