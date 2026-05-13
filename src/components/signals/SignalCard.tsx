"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";

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
  /**
   * Opt into per-card interactive expansion. When provided, the Card owns
   * its expanded/collapsed state and renders an Expand ↓ / Collapse ↑
   * toggle in the footer. Used by the homepage (false) and the briefing
   * detail surface (true).
   */
  defaultExpanded?: boolean;
  /**
   * Legacy externally-controlled expansion. Used when defaultExpanded is
   * not provided. Ignored when defaultExpanded is provided.
   */
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
  defaultExpanded,
  expanded = false,
  compact = false,
  rank,
  tier,
  readMoreHref,
  trackingAttributes,
  className,
}: SignalCardProps) {
  const interactive = defaultExpanded !== undefined;
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded ?? false);
  const isExpanded = interactive ? localExpanded : expanded;

  const displayRank = rank ?? signal.finalSlateRank ?? signal.rank ?? 1;
  const displayTier = tier ?? resolveSignalTier(signal, displayRank);
  const whyItMatters = getWhyItMattersText(signal);
  const sourceAttribution = getSourceAttribution(signal);
  const relatedCoverage = getRelatedCoverage(signal);
  const whatHappenedBody = (signal.whatHappened || signal.summary || "").trim();
  const whatLedToThisBody = getStructuredSection(
    signal.editorialWhyItMatters,
    /led|caus|before|context/i,
  );
  const whatItConnectsToBody = (
    getStructuredSection(signal.editorialWhyItMatters, /connect|next|watch|implication/i) ||
    signal.selectionReason ||
    ""
  ).trim();

  const readMoreClassName = cn(
    "shrink-0 text-[var(--bu-size-meta)] font-normal leading-5 text-[var(--bu-text-secondary)] transition-colors",
    compact ? "hover:text-[var(--bu-text-primary)]" : "hover:text-[var(--bu-accent)]",
  );

  const toggleClassName = cn(
    "inline-flex shrink-0 items-center gap-1 text-[var(--bu-size-meta)] font-normal leading-5 text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-text-primary)]",
  );

  function handleToggle() {
    setLocalExpanded((value) => !value);
  }

  return (
    <article
      className={cn(
        "rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)]",
        compact ? "p-4" : "p-4 md:p-6",
        className,
      )}
      data-testid="signal-card"
      data-signal-tier={displayTier}
      data-signal-expanded={isExpanded ? "true" : "false"}
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
              !isExpanded && !compact && "line-clamp-2",
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
        {interactive ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isExpanded}
            className={toggleClassName}
            data-testid="signal-card-toggle"
            {...trackingAttributes}
          >
            {isExpanded ? "Collapse" : "Expand"}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isExpanded ? "rotate-180" : "rotate-0",
              )}
            />
          </button>
        ) : readMoreHref ? (
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

      {isExpanded ? (
        <div className="mt-4 border-t border-[var(--bu-border-subtle)] pt-4">
          <div className="space-y-4">
            <WhatHappenedSection body={whatHappenedBody} />
            <ExpandedSerifSection label="Why this matters" body={whyItMatters} />
            <WhatLedToThisSection body={whatLedToThisBody} />
            <ExpandedSerifSection
              label="What it connects to"
              body={whatItConnectsToBody}
            />
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[var(--bu-size-micro)] font-medium uppercase leading-none tracking-[0.08em] text-[var(--bu-text-tertiary)]">
      {children}
    </p>
  );
}

/**
 * "What happened" body is the source-headline treatment — rendered in
 * sans, not serif, to signal factual reporting rather than editorial
 * judgment. See work prompt Change 1 typography rules.
 */
function WhatHappenedSection({ body }: { body: string }) {
  if (!body.trim()) {
    return null;
  }

  return (
    <section>
      <SectionLabel>What happened</SectionLabel>
      <p className="mt-1 font-sans text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-primary)]">
        {body}
      </p>
    </section>
  );
}

/**
 * "Why this matters" / "What it connects to" — editorial-voice sections
 * in serif. Empty sections are suppressed to avoid empty boxes.
 */
function ExpandedSerifSection({ label, body }: { label: string; body: string }) {
  if (!body.trim()) {
    return null;
  }

  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-primary)]">
        {body}
      </p>
    </section>
  );
}

/**
 * "What led to this" is the structural-causation layer and must render
 * even when the underlying data is empty, per work prompt Change 1
 * acceptance criteria. Empty state uses an italic placeholder so the
 * absence is visible rather than silently hidden.
 */
function WhatLedToThisSection({ body }: { body: string }) {
  const trimmed = body.trim();

  return (
    <section>
      <SectionLabel>What led to this</SectionLabel>
      {trimmed ? (
        <p className="mt-1 font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-primary)]">
          {trimmed}
        </p>
      ) : (
        <p className="mt-1 font-heading italic text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-tertiary)]">
          No structural context yet for this signal.
        </p>
      )}
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
