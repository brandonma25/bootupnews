import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { buildEditorialWhyItMattersText } from "@/lib/editorial-content";
import type { EditorialWhyItMattersContent } from "@/lib/editorial-content";
import { cn } from "@/lib/utils";
import { TierBadge, type SignalTier } from "./TierBadge";

type SourceLink = {
  title: string;
  url: string;
  sourceName: string;
};

export type SignalCardSignal = {
  id: string;
  title: string;
  rank?: number | null;
  summary?: string | null;
  whatHappened?: string | null;
  whyItMatters?: string | null;
  publishedWhyItMatters?: string | null;
  editedWhyItMatters?: string | null;
  aiWhyItMatters?: string | null;
  editorialWhyItMatters?: EditorialWhyItMattersContent | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  relatedArticles?: SourceLink[];
  finalSlateRank?: number | null;
  finalSlateTier?: SignalTier | null;
  signalRole?: SignalTier | string | null;
  selectionReason?: string | null;
};

export type SignalCardProps = {
  signal: SignalCardSignal;
  expanded?: boolean;
  compact?: boolean;
  rank?: number;
  tier?: SignalTier;
  readMoreHref?: string;
  trackingAttributes?: Record<string, string | number | undefined>;
  className?: string;
};

export function SignalCard({
  signal,
  expanded = false,
  compact = false,
  rank,
  tier,
  readMoreHref,
  trackingAttributes,
  className,
}: SignalCardProps) {
  const displayRank = rank ?? signal.finalSlateRank ?? signal.rank ?? 1;
  const displayTier = tier ?? resolveSignalTier(signal, displayRank);
  const whyItMatters = getWhyItMattersText(signal);
  const sourceAttribution = getSourceAttribution(signal);
  const relatedCoverage = getRelatedCoverage(signal);
  const whatLedToThis = getStructuredSection(signal.editorialWhyItMatters, /led|caus|before|context/i);
  const whatItConnectsTo = getStructuredSection(signal.editorialWhyItMatters, /connect|next|watch|implication/i);
  const readMoreClassName = cn(
    "shrink-0 text-[var(--bu-size-meta)] font-normal leading-5 text-[var(--bu-text-secondary)] transition-colors",
    compact ? "hover:text-[var(--bu-text-primary)]" : "hover:text-[var(--bu-accent)]",
  );

  return (
    <article
      className={cn(
        "rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)]",
        compact ? "p-4" : "p-4 md:p-6",
        className,
      )}
      data-testid="signal-card"
      data-signal-tier={displayTier}
    >
      <TierBadge tier={displayTier} rank={displayRank} accented={!compact} />

      <h2
        className={cn(
          "mt-3 font-sans font-medium tracking-[-0.015em] text-[var(--bu-text-primary)]",
          compact
            ? "text-[18px] leading-[1.28]"
            : "text-[var(--bu-size-card-title-mobile)] leading-[1.25] md:text-[var(--bu-size-card-title)]",
        )}
      >
        {signal.title}
      </h2>

      {whyItMatters ? (
        <section className="mt-3">
          <p className="text-[var(--bu-size-micro)] font-medium uppercase leading-none tracking-[0.08em] text-[var(--bu-text-tertiary)]">
            Why this matters
          </p>
          <p
            className={cn(
              "mt-1 font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-primary)]",
              !expanded && !compact && "line-clamp-2",
              compact && "line-clamp-2 text-[var(--bu-size-meta)] leading-[1.5]",
            )}
            data-testid="signal-why-this-matters"
          >
            {whyItMatters}
          </p>
        </section>
      ) : null}

      <footer className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--bu-border-subtle)] pt-3">
        <p className="min-w-0 truncate text-[var(--bu-size-meta)] font-normal leading-5 text-[var(--bu-text-tertiary)]">
          {sourceAttribution}
        </p>
        {readMoreHref ? (
          <Link
            href={readMoreHref}
            className={readMoreClassName}
            {...trackingAttributes}
          >
            Read more →
          </Link>
        ) : signal.sourceUrl ? (
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={readMoreClassName}
            {...trackingAttributes}
          >
            Read more →
          </a>
        ) : null}
      </footer>

      {expanded ? (
        <div className="mt-4 border-t border-[var(--bu-border-subtle)] pt-4">
          <div className="space-y-4">
            <ExpandedSection label="What happened" body={signal.whatHappened || signal.summary || ""} />
            <ExpandedSection label="Why this matters" body={whyItMatters} />
            <ExpandedSection label="What led to this" body={whatLedToThis} />
            <ExpandedSection label="What it connects to" body={whatItConnectsTo || signal.selectionReason || ""} />
          </div>

          {relatedCoverage.length ? (
            <section className="mt-4 border-t border-[var(--bu-border-subtle)] pt-4">
              <p className="text-[var(--bu-size-micro)] font-medium uppercase leading-none tracking-[0.08em] text-[var(--bu-text-tertiary)]">
                Supporting coverage
              </p>
              <div className="mt-3 grid gap-2">
                {relatedCoverage.map((source) => (
                  <a
                    key={`${source.sourceName}-${source.url}-${source.title}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-3 rounded-[var(--bu-radius-md)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] px-3 py-3 text-[var(--bu-size-meta)] leading-5 text-[var(--bu-text-primary)] transition-colors hover:border-[var(--bu-border-default)] hover:text-[var(--bu-accent)]"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{source.sourceName}</span>
                      {source.title && source.title.trim() !== source.sourceName.trim() ? (
                        <span className="text-[var(--bu-text-secondary)]">: {source.title}</span>
                      ) : null}
                    </span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--bu-text-tertiary)]" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ExpandedSection({ label, body }: { label: string; body: string }) {
  if (!body.trim()) {
    return null;
  }

  return (
    <section>
      <p className="text-[var(--bu-size-micro)] font-medium uppercase leading-none tracking-[0.08em] text-[var(--bu-text-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-primary)]">
        {body}
      </p>
    </section>
  );
}

function resolveSignalTier(signal: SignalCardSignal, rank: number): SignalTier {
  if (signal.finalSlateTier === "context" || signal.signalRole === "context") {
    return "context";
  }

  if (signal.finalSlateTier === "core" || signal.signalRole === "core") {
    return "core";
  }

  return rank >= 6 ? "context" : "core";
}

function getWhyItMattersText(signal: SignalCardSignal) {
  const structured = signal.editorialWhyItMatters;
  const fallback =
    signal.publishedWhyItMatters ||
    signal.editedWhyItMatters ||
    signal.whyItMatters ||
    signal.aiWhyItMatters ||
    "";

  if (!structured) {
    return fallback.trim();
  }

  return buildEditorialWhyItMattersText(structured, fallback).trim();
}

function getStructuredSection(
  content: EditorialWhyItMattersContent | null | undefined,
  pattern: RegExp,
) {
  return content?.sections.find((section) => pattern.test(section.title))?.body.trim() ?? "";
}

function getSourceAttribution(signal: SignalCardSignal) {
  const relatedSources = getRelatedCoverage(signal)
    .map((source) => source.sourceName.trim())
    .filter(Boolean);
  const sources = Array.from(new Set([signal.sourceName ?? "", ...relatedSources].map((source) => source.trim()).filter(Boolean)));

  if (sources.length === 0) {
    return "Source unavailable";
  }

  if (sources.length === 1) {
    return sources[0];
  }

  if (sources.length === 2) {
    return `${sources[0]} + ${sources[1]}`;
  }

  return `${sources[0]} + ${sources.length - 1} sources`;
}

function getRelatedCoverage(signal: SignalCardSignal): SourceLink[] {
  if (Array.isArray(signal.relatedArticles)) {
    return signal.relatedArticles.filter((source) => isValidSourceUrl(source.url));
  }

  if (signal.sourceUrl && isValidSourceUrl(signal.sourceUrl)) {
    return [
      {
        title: signal.sourceName || "Source",
        sourceName: signal.sourceName || "Source",
        url: signal.sourceUrl,
      },
    ];
  }

  return [];
}

function isValidSourceUrl(url: string | null | undefined) {
  try {
    const parsed = new URL(url ?? "");
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
