"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";

import AuthModal from "@/components/auth/auth-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getArticleRationale } from "@/lib/article-rationale";
import type { BriefingItem, DashboardData, Source, ViewerAccount } from "@/lib/types";
import { cn, formatBriefingDate, minutesToLabel } from "@/lib/utils";

type LandingHomepageProps = {
  data: DashboardData;
  viewer: ViewerAccount | null;
  authState?: string;
};

type CategoryKey = "Tech" | "Finance" | "Politics";

type EventArticle = {
  title: string;
  url: string;
  sourceName: string;
  note?: string;
};

type EventTimelineMilestone = {
  label: string;
  detail: string;
};

type HomepageEvent = {
  id: string;
  topicName: string;
  title: string;
  summary: string;
  whyItMatters: string;
  relatedArticles: EventArticle[];
  timeline: EventTimelineMilestone[];
  estimatedMinutes: number;
  importanceLabel?: BriefingItem["importanceLabel"];
  rankingSignals: string[];
  matchedKeywords: string[];
  priority: BriefingItem["priority"];
  rankScore: number;
};

const CATEGORY_CONFIG: Array<{
  key: CategoryKey;
  label: string;
  description: string;
  keywords: string[];
}> = [
  {
    key: "Tech",
    label: "Tech",
    description: "AI, platforms, chips, infrastructure, and software shifts worth tracking.",
    keywords: ["tech", "ai", "chip", "chips", "nvidia", "software", "cloud", "model", "data center"],
  },
  {
    key: "Finance",
    label: "Finance",
    description: "Markets, companies, macro moves, and business developments with decision impact.",
    keywords: ["finance", "market", "markets", "fed", "stocks", "earnings", "economy", "business", "inflation"],
  },
  {
    key: "Politics",
    label: "Politics",
    description: "Government, regulation, elections, and policy changes shaping the operating environment.",
    keywords: ["politic", "policy", "government", "regulation", "election", "congress", "senate", "white house"],
  },
];

export default function LandingHomepage({ data, viewer, authState }: LandingHomepageProps) {
  const [authModalManuallyOpen, setAuthModalManuallyOpen] = useState(false);
  const [dismissedAuthState, setDismissedAuthState] = useState<string | null>(null);
  const signedIn = Boolean(viewer);
  const currentHash = useHashValue();

  const { featured, topRanked, categorySections, trending } = useMemo(
    () => organizeHomepageContent(data.briefing.items, data.sources),
    [data.briefing.items, data.sources],
  );

  const authMessage = getHomepageAuthMessage(authState);
  const authStateRequestsModal = Boolean(authState && authState !== "confirm" && !signedIn && dismissedAuthState !== authState);
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
        <HomepageNav signedIn={signedIn} viewer={viewer} onSignIn={() => setAuthModalManuallyOpen(true)} />

        <div className="mt-8 space-y-10 lg:mt-10 lg:space-y-14">
          <HeroIntelligenceBlock
            briefingDate={data.briefing.briefingDate}
            mode={data.mode}
            featured={featured}
            onPrimaryAction={() => setAuthModalManuallyOpen(true)}
            signedIn={signedIn}
          />

          <TopRankedEventsSection events={topRanked} />

          <section className="space-y-8 lg:space-y-10">
            {categorySections.map((section) => (
              <CategorySection
                key={section.label}
                label={section.label}
                description={section.description}
                events={section.events}
              />
            ))}
          </section>

          <TrendingSection events={trending} />

          <DelayedCtaSection signedIn={signedIn} onOpenAuth={() => setAuthModalManuallyOpen(true)} />
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
            <Badge>{mode === "live" ? "Live mode" : mode === "public" ? "Public mode" : "Demo mode"}</Badge>
            <Badge>{formatBriefingDate(briefingDate)}</Badge>
          </div>
          <h1 className="display-font mt-6 max-w-3xl text-[2.35rem] leading-[1.04] text-[var(--foreground)] sm:text-[3rem] lg:text-[3.45rem]">
            Understand what matters today and why.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--muted)] sm:text-[17px] sm:leading-8">
            Daily Intelligence Aggregator ranks the most important developments, groups related coverage into events, and gives you the context needed to interpret impact fast.
          </p>
          <p className="mt-5 text-sm font-medium text-[var(--foreground)]/88">
            Less article chasing. More signal, context, and meaning.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            <SignalPill title="Event-first" detail="Coverage is grouped into developments, not dumped as isolated links." />
            <SignalPill title="Context-led" detail="Why it matters and what led here stay visible." />
            <SignalPill title="Ranked by signal" detail="The homepage emphasizes importance, not just recency." />
          </div>
          {!signedIn ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button className="px-5" onClick={onPrimaryAction}>
                Get Briefing
              </Button>
              <p className="text-sm text-[var(--muted)]">Browse the ranked briefing first. Save your own feed when you are ready.</p>
            </div>
          ) : (
            <div className="mt-8 text-sm text-[var(--muted)]">Your homepage below is structured as ranked events with grouped supporting coverage.</div>
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/88">{title}</p>
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
            showTimeline
            showRelatedArticles
          />
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Briefing flow</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Lead event first, ranked developments next, then secondary event coverage.</p>
            </div>
            {signedIn ? (
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
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
        <div className="rounded-[24px] border border-[var(--line)] bg-white/55 p-5 text-sm leading-7 text-[var(--muted)]">
          The lead event will appear here once feeds refresh and the ranking pass has enough coverage to surface a top development.
        </div>
      )}
    </Panel>
  );
}

function TopRankedEventsSection({ events }: { events: HomepageEvent[] }) {
  return (
    <section id="top-events" className="space-y-5 lg:space-y-6">
      <SectionHeader
        eyebrow="Top 5 Most Important Events Today"
        title="The developments most worth your attention right now"
        description="This ranked layer favors importance over chronology, with grouped supporting coverage under each event."
      />
      {events.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          {events.map((event, index) => (
            <div key={event.id} className={cn(index === 0 ? "xl:col-span-7" : "xl:col-span-5")}>
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
                  label="Ranked event"
                  showTimeline={index === 0}
                  showRelatedArticles
                />
              </Panel>
            </div>
          ))}
        </div>
      ) : (
        <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
          Ranked events will appear here as the briefing fills out.
        </Panel>
      )}
    </section>
  );
}

function CategorySection({
  label,
  description,
  events,
}: {
  label: string;
  description: string;
  events: HomepageEvent[];
}) {
  return (
    <section id={label.toLowerCase()} className="space-y-4">
      <SectionHeader eyebrow="Category" title={label} description={description} compact />
      {events.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Panel key={event.id} className="border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)] p-5 transition-transform duration-150 hover:-translate-y-0.5">
              <EventCard event={event} variant="compact" label="Event" showRelatedArticles />
            </Panel>
          ))}
        </div>
      ) : (
        <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
          No ranked events are grouped here yet. This section stays ready as coverage expands.
        </Panel>
      )}
    </section>
  );
}

function TrendingSection({ events }: { events: HomepageEvent[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Trending / Important"
        title="Other developments worth keeping in view"
        description="A lower-priority tail section for breadth once the top-ranked events are clear."
        compact
      />
      {events.length ? (
        <Panel className="overflow-hidden border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)] p-0">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                "px-5 py-5",
                index !== events.length - 1 && "border-b border-[var(--line)]",
              )}
            >
              <EventCard event={event} variant="list" label="Event" showRelatedArticles />
            </div>
          ))}
        </Panel>
      ) : (
        <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
          Once more stories are available, lower-priority events will collect here in a compact scan.
        </Panel>
      )}
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
  const rationale = getArticleRationale(event);

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
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
        <p className={cn("mt-3 text-[var(--muted)]", emphatic ? "text-sm leading-7 lg:text-[15px]" : "text-sm leading-6")}>
          {event.summary}
        </p>
        <p
          className={cn(
            "mt-2 text-sm font-medium",
            rationale.kind === "keyword" ? "text-[#294f86]" : "text-[var(--muted)]",
          )}
        >
          {rationale.text}
        </p>
      </div>

      <WhyItMattersBlock text={event.whyItMatters} emphatic={emphatic} />

      {showTimeline && event.timeline.length ? <TimelineBlock timeline={event.timeline} /> : null}

      {showRelatedArticles ? <RelatedArticlesList articles={event.relatedArticles} compact={compact || list} /> : null}

      <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
        <MetaPill>{minutesToLabel(event.estimatedMinutes)} read</MetaPill>
        <MetaPill>{event.relatedArticles.length} related sources</MetaPill>
        {event.rankingSignals[1] ? <MetaPill>{event.rankingSignals[1]}</MetaPill> : null}
      </div>
    </div>
  );
}

function WhyItMattersBlock({ text, emphatic = false }: { text: string; emphatic?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[22px] border-l-2 border-[#294f86] bg-[rgba(41,79,134,0.05)] px-4 py-3",
        emphatic && "border border-[rgba(41,79,134,0.14)] bg-[linear-gradient(180deg,rgba(41,79,134,0.08),rgba(41,79,134,0.03))]",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#294f86]">Why it matters</p>
      <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{text}</p>
    </div>
  );
}

function TimelineBlock({ timeline }: { timeline: EventTimelineMilestone[] }) {
  return (
    <div className="rounded-[22px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.58)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">What led to today</p>
      <div className="mt-4 space-y-3">
        {timeline.map((milestone) => (
          <div key={`${milestone.label}-${milestone.detail}`} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#294f86]">{milestone.label}</p>
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
  articles: EventArticle[];
  compact?: boolean;
}) {
  if (!articles.length) return null;

  return (
    <div className="rounded-[22px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.52)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Related coverage</p>
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
              <p className={cn("font-semibold text-[var(--foreground)]", compact ? "text-sm leading-5" : "text-sm leading-6")}>
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Daily briefing access</p>
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{eyebrow}</p>
      <h2 className={cn("mt-2 font-semibold tracking-tight text-[var(--foreground)]", compact ? "text-[1.45rem]" : "text-[1.8rem] lg:text-[2rem]")}>{title}</h2>
      <p className={cn("mt-2 text-[var(--muted)]", compact ? "text-sm leading-7" : "text-sm leading-7 lg:text-[15px]")}>{description}</p>
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

function organizeHomepageContent(items: BriefingItem[], sources: Source[]) {
  const events = buildHomepageEvents(items, sources);
  const featured = events[0] ?? null;
  const topRanked = events.slice(0, 5);
  const reservedIds = new Set<string>(topRanked.map((event) => event.id));

  const categorySections = CATEGORY_CONFIG.map((category) => {
    const matchingEvents = events.filter((event) => !reservedIds.has(event.id) && eventMatchesCategory(event, category));
    matchingEvents.forEach((event) => reservedIds.add(event.id));

    return {
      label: category.label,
      description: category.description,
      events: matchingEvents.slice(0, 3),
    };
  });

  const trending = events.filter((event) => !reservedIds.has(event.id)).slice(0, 4);

  return {
    featured,
    topRanked,
    categorySections,
    trending,
  };
}

function buildHomepageEvents(items: BriefingItem[], sources: Source[]): HomepageEvent[] {
  return items
    .slice()
    .sort((left, right) => getRankScore(right) - getRankScore(left))
    .map((item, index, sortedItems) => {
      const siblingItems = sortedItems.filter((candidate) => candidate.id !== item.id && candidate.topicId === item.topicId);

      return {
        id: item.id,
        topicName: item.topicName,
        title: item.title,
        summary: summarize(item.whatHappened, item.priority === "top" ? 2 : 1),
        whyItMatters: item.whyItMatters,
        relatedArticles: buildRelatedArticles(item, siblingItems, sources),
        timeline: buildEventTimeline(item, siblingItems),
        estimatedMinutes: item.estimatedMinutes,
        importanceLabel: item.importanceLabel,
        rankingSignals: item.rankingSignals ?? [],
        matchedKeywords: item.matchedKeywords ?? [],
        priority: item.priority,
        rankScore: getRankScore(item) - index * 0.01,
      };
    });
}

function buildRelatedArticles(item: BriefingItem, siblingItems: BriefingItem[], sources: Source[]) {
  if (item.relatedArticles?.length) {
    return item.relatedArticles.slice(0, 5).map((article) => ({
      title: article.title,
      url: article.url,
      sourceName: article.sourceName,
      note: "Primary coverage",
    }));
  }

  const supportCoverage = [
    ...item.sources.map((source) => ({
      title: source.title === item.title ? source.title : `${source.title} coverage`,
      url: source.url,
      sourceName: source.title,
      note: "Primary coverage",
    })),
    ...siblingItems.flatMap((sibling) =>
      sibling.sources.map((source) => ({
        title: `${source.title} on ${sibling.title}`,
        url: source.url,
        sourceName: source.title,
        note: "Related development",
      })),
    ),
    ...sources
      .filter((source) => source.topicId === item.topicId)
      .map((source) => ({
        title: `Monitor ${source.name}`,
        url: source.homepageUrl ?? source.feedUrl,
        sourceName: source.name,
        note: "Topic watchlist",
      })),
  ];

  const seen = new Set<string>();

  return supportCoverage
    .filter((article) => isValidStoryUrl(article.url))
    .filter((article) => {
      const key = `${article.url}-${article.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function buildEventTimeline(item: BriefingItem, siblingItems: BriefingItem[]) {
  const keywordMilestone = item.matchedKeywords?.length
    ? {
        label: "Trigger",
        detail: `The event began surfacing across coverage through matches on ${item.matchedKeywords.join(", ")}.`,
      }
    : null;

  const keyPointMilestones = item.keyPoints
    .filter((point) => !point.startsWith("Matched on:"))
    .map((point, index) => ({
      label: index === 0 ? "Earlier" : index === 1 ? "Shift" : "Now",
      detail: point,
    }));

  const siblingMilestones = siblingItems.slice(0, 2).map((sibling, index) => ({
    label: index === 0 ? "Build-up" : "Follow-on",
    detail: summarize(sibling.whatHappened, 1),
  }));

  const timeline = [keywordMilestone, ...keyPointMilestones, ...siblingMilestones].filter(
    (milestone): milestone is EventTimelineMilestone => Boolean(milestone),
  );

  return timeline.slice(0, 3);
}

function getRankScore(item: BriefingItem) {
  return (
    (item.importanceScore ?? 0) +
    (item.matchScore ?? 0) +
    (item.priority === "top" ? 100 : 0)
  );
}

function eventMatchesCategory(event: HomepageEvent, category: (typeof CATEGORY_CONFIG)[number]) {
  const haystack = `${event.topicName} ${event.title} ${event.summary} ${event.whyItMatters}`.toLowerCase();
  return category.keywords.some((keyword) => haystack.includes(keyword));
}

function summarize(value: string, maxSentences: number) {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, maxSentences).join(" ") || value;
}

function isValidStoryUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
