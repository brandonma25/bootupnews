"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";

import AuthModal from "@/components/auth/auth-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { BriefingItem, DashboardData, ViewerAccount } from "@/lib/types";
import { cn, formatBriefingDate, minutesToLabel } from "@/lib/utils";

type LandingHomepageProps = {
  data: DashboardData;
  viewer: ViewerAccount | null;
};

type CategoryKey = "Tech" | "Finance" | "Politics";

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

export default function LandingHomepage({ data, viewer }: LandingHomepageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const signedIn = Boolean(viewer);
  const items = data.briefing.items;

  const { featured, topEvents, categorySections, trending } = useMemo(
    () => organizeHomepageContent(items),
    [items],
  );

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-24 lg:pt-6">
        <HomepageNav signedIn={signedIn} viewer={viewer} onSignIn={() => setAuthModalOpen(true)} />

        <div className="mt-8 space-y-10 lg:mt-10 lg:space-y-14">
          <HeroIntelligenceBlock
            briefingDate={data.briefing.briefingDate}
            mode={data.mode}
            featured={featured}
            onPrimaryAction={() => setAuthModalOpen(true)}
            signedIn={signedIn}
          />

          <TopEventsSection items={topEvents} />

          <section className="space-y-8 lg:space-y-10">
            {categorySections.map((section) => (
              <CategorySection
                key={section.label}
                label={section.label}
                description={section.description}
                items={section.items}
              />
            ))}
          </section>

          <TrendingSection items={trending} />

          <DelayedCtaSection signedIn={signedIn} onOpenAuth={() => setAuthModalOpen(true)} />
        </div>
      </main>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
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
  featured: BriefingItem | null;
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
            Daily Intelligence Aggregator ranks the most important developments, connects the context behind them, and helps you understand impact faster.
          </p>
          <p className="mt-5 text-sm font-medium text-[var(--foreground)]/88">
            Less headline chasing. More signal, context, and meaning.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            <SignalPill title="Prioritized" detail="Opinionated ranking, not a flat feed." />
            <SignalPill title="Context-led" detail="Why it matters is part of the core read." />
            <SignalPill title="Built to interpret" detail="Meaning first, scanning second." />
          </div>
          {!signedIn ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button className="px-5" onClick={onPrimaryAction}>
                Get Briefing
              </Button>
              <p className="text-sm text-[var(--muted)]">Browse the ranked briefing first. Save your own feed when you are ready.</p>
            </div>
          ) : (
            <div className="mt-8 text-sm text-[var(--muted)]">Your briefing is organized below by priority, topic, and impact.</div>
          )}
        </div>
      </div>

      <FeaturedStoryCard item={featured} onOpenAuth={onPrimaryAction} signedIn={signedIn} />
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

function FeaturedStoryCard({
  item,
  onOpenAuth,
  signedIn,
}: {
  item: BriefingItem | null;
  onOpenAuth: () => void;
  signedIn: boolean;
}) {
  const primarySource = item?.sources.find((source) => isValidStoryUrl(source.url));

  return (
    <Panel className="flex h-full flex-col justify-between rounded-[32px] border-[rgba(19,26,34,0.1)] bg-[rgba(255,255,255,0.78)] px-6 py-6 shadow-[0_24px_80px_rgba(17,24,39,0.07)] lg:px-7 lg:py-7">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Most important now</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Featured event</p>
          </div>
          {item?.importanceLabel ? (
            <span className="inline-flex rounded-full border border-[rgba(41,79,134,0.16)] bg-[rgba(41,79,134,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#294f86]">
              {item.importanceLabel}
            </span>
          ) : null}
        </div>

        {item ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge>{item.topicName}</Badge>
              {item.rankingSignals?.[0] ? <Badge className="text-[#294f86]">{item.rankingSignals[0]}</Badge> : null}
              {item.matchedKeywords?.length ? <Badge>Matched on {item.matchedKeywords[0]}</Badge> : null}
            </div>
            {primarySource ? (
              <a
                href={primarySource.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-start gap-2 text-[1.45rem] font-semibold leading-tight text-[var(--foreground)] underline-offset-4 hover:underline lg:text-[1.7rem]"
              >
                <span>{item.title}</span>
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
              </a>
            ) : (
              <h2 className="mt-5 text-[1.45rem] font-semibold leading-tight text-[var(--foreground)] lg:text-[1.7rem]">{item.title}</h2>
            )}
            <p className="mt-4 text-sm leading-7 text-[var(--muted)] lg:text-[15px]">
              {summarize(item.whatHappened, 2)}
            </p>
            <div className="mt-5 rounded-[24px] border border-[rgba(41,79,134,0.14)] bg-[linear-gradient(180deg,rgba(41,79,134,0.08),rgba(41,79,134,0.03))] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#294f86]">Why it matters</p>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{item.whyItMatters}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
              <MetaPill>{minutesToLabel(item.estimatedMinutes)} read</MetaPill>
              {item.sources.length ? <MetaPill>{item.sources.length} sources</MetaPill> : null}
              {item.priority === "top" ? <MetaPill>Top priority</MetaPill> : null}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/55 p-5 text-sm leading-7 text-[var(--muted)]">
            The lead event will appear here once feeds refresh and the ranking pass has enough coverage to surface a top story.
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Briefing flow</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Lead event first, ranked developments next, then topic coverage and tail risk.</p>
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
    </Panel>
  );
}

function TopEventsSection({ items }: { items: BriefingItem[] }) {
  return (
    <section id="top-events" className="space-y-5 lg:space-y-6">
      <SectionHeader
        eyebrow="Top Events Today"
        title="The developments most worth your attention right now"
        description="This is the ranking layer: the biggest events in the current briefing, surfaced in order of importance."
      />
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          {items.map((item, index) => (
            <div key={item.id} className={cn(index === 0 ? "xl:col-span-7" : "xl:col-span-5")}>
              <TopEventCard item={item} rank={index + 1} featured={index === 0} />
            </div>
          ))}
        </div>
      ) : (
        <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
          More top events will appear here as the briefing fills out.
        </Panel>
      )}
    </section>
  );
}

function TopEventCard({ item, rank, featured }: { item: BriefingItem; rank: number; featured: boolean }) {
  const primarySource = item.sources.find((source) => isValidStoryUrl(source.url));

  return (
    <Panel
      className={cn(
        "group flex h-full flex-col justify-between border-[rgba(19,26,34,0.1)] bg-[rgba(255,255,255,0.76)] p-5 transition-transform duration-150 hover:-translate-y-0.5",
        featured && "rounded-[30px] p-6 lg:p-7",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(41,79,134,0.1)] text-[1.15rem] font-semibold text-[#294f86] lg:h-14 lg:w-14 lg:text-[1.35rem]">
              #{rank}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Ranked event</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>{item.topicName}</Badge>
                {item.importanceLabel ? <Badge className="text-[#294f86]">{item.importanceLabel}</Badge> : null}
              </div>
            </div>
          </div>
          {item.matchedKeywords?.[0] ? (
            <span className="text-xs font-medium text-[var(--muted)]">Matched on {item.matchedKeywords[0]}</span>
          ) : null}
        </div>

        {primarySource ? (
          <a
            href={primarySource.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mt-5 inline-flex items-start gap-2 font-semibold leading-snug text-[var(--foreground)] underline-offset-4 hover:underline",
              featured ? "text-[1.45rem] lg:text-[1.6rem]" : "text-[1.2rem]",
            )}
          >
            <span>{item.title}</span>
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          </a>
        ) : (
          <h3 className={cn("mt-5 font-semibold leading-snug text-[var(--foreground)]", featured ? "text-[1.45rem] lg:text-[1.6rem]" : "text-[1.2rem]")}>{item.title}</h3>
        )}
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{summarize(item.whatHappened, featured ? 2 : 1)}</p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-[22px] border-l-2 border-[#294f86] bg-[rgba(41,79,134,0.05)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#294f86]">Why it matters</p>
          <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{item.whyItMatters}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
          <MetaPill>{minutesToLabel(item.estimatedMinutes)} read</MetaPill>
          {item.sources.length ? <MetaPill>{item.sources.length} sources</MetaPill> : null}
          {item.rankingSignals?.[0] ? <MetaPill>{item.rankingSignals[0]}</MetaPill> : null}
        </div>
      </div>
    </Panel>
  );
}

function CategorySection({
  label,
  description,
  items,
}: {
  label: string;
  description: string;
  items: BriefingItem[];
}) {
  return (
    <section id={label.toLowerCase()} className="space-y-4">
      <SectionHeader eyebrow="Category" title={label} description={description} compact />
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <CompactStoryCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
          No ranked stories are grouped here yet. This section stays ready as coverage expands.
        </Panel>
      )}
    </section>
  );
}

function CompactStoryCard({ item }: { item: BriefingItem }) {
  const primarySource = item.sources.find((source) => isValidStoryUrl(source.url));

  return (
    <Panel className="border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)] p-5 transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{item.topicName}</Badge>
        {item.importanceLabel ? <Badge className="text-[#294f86]">{item.importanceLabel}</Badge> : null}
      </div>
      {primarySource ? (
        <a
          href={primarySource.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-start gap-2 text-[1.05rem] font-semibold leading-snug text-[var(--foreground)] underline-offset-4 hover:underline"
        >
          <span>{item.title}</span>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
        </a>
      ) : (
        <h3 className="mt-4 text-[1.05rem] font-semibold leading-snug text-[var(--foreground)]">{item.title}</h3>
      )}
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{summarize(item.whatHappened, 1)}</p>
      <div className="mt-4 border-t border-[var(--line)] pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Why it matters</p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{item.whyItMatters}</p>
      </div>
    </Panel>
  );
}

function TrendingSection({ items }: { items: BriefingItem[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Trending / Important"
        title="Other developments worth keeping in view"
        description="A lower-priority tail section for additional breadth once the top of the briefing is clear."
        compact
      />
      {items.length ? (
        <Panel className="overflow-hidden border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.62)] p-0">
          {items.map((item, index) => {
            const primarySource = item.sources.find((source) => isValidStoryUrl(source.url));
            return (
              <div
                key={item.id}
                className={cn(
                  "grid gap-3 px-5 py-4 lg:grid-cols-[120px_minmax(0,1fr)_minmax(220px,0.7fr)] lg:items-start",
                  index !== items.length - 1 && "border-b border-[var(--line)]",
                )}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{item.topicName}</p>
                  {item.importanceLabel ? <p className="mt-2 text-sm font-medium text-[#294f86]">{item.importanceLabel}</p> : null}
                </div>
                <div>
                  {primarySource ? (
                    <a
                      href={primarySource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-2 text-base font-semibold leading-snug text-[var(--foreground)] underline-offset-4 hover:underline"
                    >
                      <span>{item.title}</span>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                    </a>
                  ) : (
                    <h3 className="text-base font-semibold leading-snug text-[var(--foreground)]">{item.title}</h3>
                  )}
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{summarize(item.whatHappened, 1)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Why it matters</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{item.whyItMatters}</p>
                </div>
              </div>
            );
          })}
        </Panel>
      ) : (
        <Panel className="p-5 text-sm leading-7 text-[var(--muted)]">
          Once more stories are available, lower-priority items will collect here in a compact scan.
        </Panel>
      )}
    </section>
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

function organizeHomepageContent(items: BriefingItem[]) {
  const featured = items[0] ?? null;
  const topEvents = items.slice(1, 5);
  const reservedIds = new Set<string>([...(featured ? [featured.id] : []), ...topEvents.map((item) => item.id)]);

  const categorySections = CATEGORY_CONFIG.map((category) => {
    const preferred = items.filter((item) => !reservedIds.has(item.id) && itemMatchesCategory(item, category));
    preferred.forEach((item) => reservedIds.add(item.id));

    return {
      label: category.label,
      description: category.description,
      items: preferred.slice(0, 3),
    };
  });

  const trending = items.filter((item) => !reservedIds.has(item.id)).slice(0, 6);

  return {
    featured,
    topEvents,
    categorySections,
    trending,
  };
}

function itemMatchesCategory(item: BriefingItem, category: (typeof CATEGORY_CONFIG)[number]) {
  const haystack = `${item.topicName} ${item.title} ${item.whatHappened} ${item.whyItMatters}`.toLowerCase();
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
