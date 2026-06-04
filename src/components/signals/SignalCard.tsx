"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";

import { buildEditorialWhyItMattersText } from "@/lib/editorial-content";
import type { EditorialWhyItMattersContent } from "@/lib/editorial-content";
import { registerSignalReadObserver, type SignalReadTracking } from "@/lib/signal-read-tracking";
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
  // #274 Before This + The Ripple public values. The foldback reads ONLY
  // published_* — the empty state is shown when they're null. NEVER fall
  // back to ai_*/edited_*/human_* — that bypasses the publish gate.
  publishedWhatLedToIt?: string | null;
  publishedWhatLedToItStructured?: EditorialWhyItMattersContent | null;
  publishedWhatItConnectsTo?: string | null;
  publishedWhatItConnectsToStructured?: EditorialWhyItMattersContent | null;
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
  /**
   * When provided, emits a single `signal_read` event for this card once
   * the dwell threshold (≥50% in viewport for ≥20s continuous) is met
   * AND at least one scroll has happened while the card was visible.
   * Session-deduped per signal.
   */
  mvpDwellTracking?: SignalReadTracking;
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
  mvpDwellTracking,
  className,
}: SignalCardProps) {
  const interactive = defaultExpanded !== undefined;
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded ?? false);
  const isExpanded = interactive ? localExpanded : expanded;

  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mvpDwellTracking) {
      return;
    }
    const element = cardRef.current;
    if (!element) {
      return;
    }
    return registerSignalReadObserver(element, mvpDwellTracking);
  }, [mvpDwellTracking]);

  const displayRank = rank ?? signal.finalSlateRank ?? signal.rank ?? 1;
  const displayTier = tier ?? resolveSignalTier(signal, displayRank);
  // #278 MVP render hygiene: strip editorial citation markers ([A], [A1],
  // [P2], [F1], [V3]…) from the displayed prose so readers see clean
  // text. The markers stay in stored `published_*` columns and in the
  // structured payload — this is a render-only transform. The full
  // reader-verifiable-citations feature (footnotes/hover sources) is
  // tracked separately as a post-MVP follow-up.
  const whyItMatters = stripCitationMarkers(getWhyItMattersText(signal));
  const sourceAttribution = getSourceAttribution(signal);
  const relatedCoverage = getRelatedCoverage(signal);
  // #274 follow-up: the foldback shows EXACTLY three editorial layers
  // (The Signal → Before This → The Ripple). The leftover "What happened"
  // section and the standalone top WITM preview were removed; both made
  // the same WITM text appear twice in DOM. The collapsed card face now
  // surfaces only the title + footer + a teaser preview of The Signal,
  // and the full Signal body appears once — inside the foldback.
  // Before This + The Ripple. Read ONLY published_* — never fall back
  // to ai_*/edited_*/human_* and never re-mine the WITM payload's sections
  // array (that was the v1-era hack that surfaced empty state for cards
  // with real layer content). Empty/whitespace published_* shows the
  // layer's intentional empty state.
  const beforeThisBody = stripCitationMarkers(
    readLayerBody(signal.publishedWhatLedToIt, signal.publishedWhatLedToItStructured),
  );
  const theRippleBody = stripCitationMarkers(
    readLayerBody(signal.publishedWhatItConnectsTo, signal.publishedWhatItConnectsToStructured),
  );

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
      ref={cardRef}
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

      {/* Collapsed/compact card-face teaser. Hidden when expanded so the
          full Signal body only appears once — inside the foldback below.
          No v1 "Why this matters" label here; the foldback owns the
          labeled rendering. */}
      {!isExpanded && whyItMatters ? (
        <section className="mt-3">
          <p
            className={cn(
              "font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-primary)]",
              !compact && "line-clamp-2",
              compact && "line-clamp-2 text-[var(--bu-size-meta)] leading-[1.5]",
            )}
            data-testid="signal-card-teaser"
          >
            {whyItMatters}
          </p>
        </section>
      ) : null}

      <footer className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--bu-border-subtle)] pt-3">
        <p className="min-w-0 truncate text-[var(--bu-size-meta)] font-normal leading-5 text-[var(--bu-text-tertiary)]">
          {sourceAttribution}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {signal.sourceUrl ? (
            // Standalone external-link icon — matches the source-link
            // affordance used by category tab article rows so the card
            // face exposes the original article URL at first glance,
            // not behind the Expand toggle.
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Read source: ${signal.sourceName ?? "open original article"}`}
              title="Read at source"
              className="inline-flex items-center text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-accent)]"
              data-testid="signal-card-source-link"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
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
          ) : null}
        </div>
      </footer>

      {isExpanded ? (
        <div className="mt-4 border-t border-[var(--bu-border-subtle)] pt-4">
          {/* Foldback shows EXACTLY the three editorial layers in
              cause-then-trajectory order (editorial framework §2):
                The Signal → Before This → The Ripple.
              "What happened" was removed in this follow-up — it duplicated
              source-headline material already implied by the title and
              footer attribution, and crowded the editorial voice. v2
              labels here only; codebase-wide v1→v2 rename of
              validator/server-action/type identifiers is parked in #271. */}
          <div className="space-y-4">
            <ExpandedSerifSection label="The Signal" body={whyItMatters} />
            <LayerWithEmptyState
              label="Before This"
              body={beforeThisBody}
              emptyText="No prior context yet for this signal."
            />
            <LayerWithEmptyState
              label="The Ripple"
              body={theRippleBody}
              emptyText="No downstream trajectory yet for this signal."
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
 * Renders a Before This / The Ripple layer (#274). The brief is explicit:
 *   - Layer reads its `published_*` field (handled by the caller).
 *   - Null/empty `published_*` shows the empty state.
 *   - Do NOT fall back to `ai_*` / `edited_*` / `human_*` — that bypasses
 *     the publish gate's review step.
 */
function LayerWithEmptyState({
  label,
  body,
  emptyText,
}: {
  label: string;
  body: string;
  emptyText: string;
}) {
  const trimmed = body.trim();

  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      {trimmed ? (
        <p className="mt-1 font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-primary)]">
          {trimmed}
        </p>
      ) : (
        <p className="mt-1 font-heading italic text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-tertiary)]">
          {emptyText}
        </p>
      )}
    </section>
  );
}

/**
 * Read a #274 layer's foldback body. Prefers the structured payload's
 * built text (matches WITM's render path); falls back to the raw published
 * text. Returns "" when both are absent — the caller renders the empty
 * state. NEVER reads `ai_*` / `edited_*` / `human_*` (publish-gate bypass).
 */
function readLayerBody(
  publishedText: string | null | undefined,
  publishedStructured: EditorialWhyItMattersContent | null | undefined,
): string {
  if (publishedStructured) {
    const built = buildEditorialWhyItMattersText(publishedStructured, publishedText ?? "").trim();
    if (built) {
      return built;
    }
  }
  return (publishedText ?? "").trim();
}

/**
 * MVP render-only strip of editorial citation markers from prose so the
 * public card surface reads as clean text (issue #278). Removes any
 * bracketed single uppercase letter optionally followed by digits — the
 * canonical shape used across the editorial framework: `[A]`, `[A1]`,
 * `[A12]`, `[P1]`, `[F2]`, `[V3]`, etc. After removal, collapse the
 * whitespace artifacts the markers leave behind:
 *   - `"slipped [A]. Community"` (a marker before a period leaves
 *     a stray `" ."`) → `"slipped. Community"`.
 *   - any resulting double space → single space.
 *
 * Exported so unit tests can pin the contract without rendering the
 * whole component. NEVER mutates stored data — the markers stay in
 * `published_*` columns and in the structured payload. The full
 * reader-verifiable-citations feature (footnote rendering with source
 * URLs) is a separate post-MVP follow-up.
 */
export function stripCitationMarkers(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[[A-Z]\d*\]/g, "")
    // marker-before-punctuation artifacts: `" ."`, `" ,"`, `" ;"`, etc.
    .replace(/\s+([.,;:!?)])/g, "$1")
    // collapse double-spaces left by mid-sentence markers
    .replace(/[ \t]{2,}/g, " ")
    .trim();
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
