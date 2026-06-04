"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SignalTier } from "./TierBadge";

export type SignalCardInteractiveProps = {
  defaultExpanded: boolean;
  articleClassName: string;
  displayTier: SignalTier;
  /** Server-rendered badge slot (RSC payload — not hydrated). */
  badge: ReactNode;
  /** Server-rendered title slot. */
  title: ReactNode;
  /** Server-rendered collapsed-face teaser slot (shown only when collapsed). */
  teaser: ReactNode;
  sourceAttribution: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
  /** Server-rendered foldback slot (shown only when expanded). */
  foldback: ReactNode;
  trackingAttributes?: Record<string, string | number | undefined>;
};

/**
 * Interactive shell for an expand/collapse SignalCard.
 *
 * This is the ONLY hydrated part of an interactive card: it owns the
 * `<article>` element, the expand/collapse `useState`, and the footer toggle.
 * The heavy editorial content (`teaser`, `foldback`, `badge`, `title`) is passed
 * in as already-server-rendered React nodes, so when the card is rendered inside
 * a Server Component (the homepage route) that content is RSC payload and is NOT
 * re-hydrated on the client. The result: cards still paint expanded from SSR with
 * zero hydration of the three editorial layers, while the collapse control arms
 * after hydration. Markup is byte-identical to the previous monolithic client
 * component so there is no visual change, flash, or layout shift.
 */
export function SignalCardInteractive({
  defaultExpanded,
  articleClassName,
  displayTier,
  badge,
  title,
  teaser,
  sourceAttribution,
  sourceUrl,
  sourceName,
  foldback,
  trackingAttributes,
}: SignalCardInteractiveProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleClassName = cn(
    "inline-flex shrink-0 items-center gap-1 text-[var(--bu-size-meta)] font-normal leading-5 text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-text-primary)]",
  );

  return (
    <article
      className={articleClassName}
      data-testid="signal-card"
      data-signal-tier={displayTier}
      data-signal-expanded={isExpanded ? "true" : "false"}
    >
      {badge}
      {title}

      {!isExpanded ? teaser : null}

      <footer className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--bu-border-subtle)] pt-3">
        <p className="min-w-0 truncate text-[var(--bu-size-meta)] font-normal leading-5 text-[var(--bu-text-tertiary)]">
          {sourceAttribution}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Read source: ${sourceName ?? "open original article"}`}
              title="Read at source"
              className="inline-flex items-center text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-accent)]"
              data-testid="signal-card-source-link"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
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
        </div>
      </footer>

      {isExpanded ? foldback : null}
    </article>
  );
}
