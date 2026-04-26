import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

import { toggleReadAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { buildRankingDisplaySignals } from "@/lib/ranking";
import type { BriefingItem } from "@/lib/types";
import { buildTrustLayerPresentation } from "@/lib/why-it-matters";
import { cn } from "@/lib/utils";
import { minutesToLabel } from "@/lib/utils";

/**
 * Renders the MVP BriefingItem Card payload. StoryCard is a presentation
 * boundary and does not define canonical Signal identity.
 */
export function StoryCard({ item }: { item: BriefingItem }) {
  const primarySourceUrl = item.sources.find((source) => isValidStoryUrl(source.url))?.url;
  const sourceCount = item.sourceCount ?? item.sources.length;
  const relatedCoverage = item.relatedArticles?.length ? item.relatedArticles : null;
  const rankingDisplaySignals = buildRankingDisplaySignals(item);
  const trustLayer = buildTrustLayerPresentation(item.eventIntelligence, {
    title: item.title,
    topicName: item.topicName,
    whyItMatters: item.whyItMatters,
    sourceCount,
    rankingSignals: item.rankingSignals,
  });

  return (
    <Panel className={cn("p-6 transition-opacity", item.read && "opacity-50 hover:opacity-80")}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>{item.topicName}</Badge>
              {item.priority === "top" ? <Badge className="text-[var(--text-primary)]">Top event</Badge> : null}
              <Badge>{sourceCount} {sourceCount === 1 ? "source" : "sources"}</Badge>
              {rankingDisplaySignals[0] ? <Badge>{rankingDisplaySignals[0]}</Badge> : null}
              {item.read ? (
                <Badge className="text-[var(--text-secondary)]">Read</Badge>
              ) : null}
            </div>
            <div>
              {primarySourceUrl ? (
                <a
                  href={primarySourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "briefing-title inline-flex items-start gap-2 underline-offset-4 hover:underline",
                    item.read ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]",
                  )}
                >
                  <span>{item.title}</span>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                </a>
              ) : (
                <div>
                  <h3
                    className={cn(
                      "briefing-title",
                      item.read ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-normal text-[var(--text-secondary)]">
                    Source unavailable
                  </p>
                </div>
              )}
              <p className="mt-1.5 text-sm font-medium text-[var(--text-secondary)]">
                {minutesToLabel(item.estimatedMinutes)}
              </p>
            </div>
          </div>

          {item.id.startsWith("generated-") ? null : (
            <form action={toggleReadAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="current" value={String(item.read)} />
              <button
                className={cn(
                  "flex items-center gap-2 rounded-button border px-3 py-2 text-sm transition-colors",
                  item.read
                    ? "border-[var(--border)] bg-[var(--sidebar)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--card)]",
                )}
              >
                {item.read ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--text-primary)]" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                {item.read ? "Read" : "Mark as read"}
              </button>
            </form>
          )}
        </div>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
            What happened
          </p>
          <p className="text-base text-[var(--text-primary)]">{item.whatHappened}</p>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
            Key points
          </p>
          <ul className="space-y-2 text-[13px] leading-[1.6] text-[var(--text-primary)] md:text-sm">
            {item.keyPoints.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-button bg-[var(--text-secondary)]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
            Why this ranks
          </p>
          <p className="text-base text-[var(--text-primary)]">
            {item.eventIntelligence?.rankingReason ??
              item.rankingSignals?.[0] ??
              "This event rose because it cleared the current ranking thresholds."}
          </p>
          {rankingDisplaySignals.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {rankingDisplaySignals.slice(1).map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                >
                  {signal}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {item.explanationPacket?.connection_layer ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
                Connections
              </p>
              <span className="inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {item.explanationPacket.connection_layer.connection_confidence} confidence
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
                  What led to this
                </p>
                <p className="mt-1 text-base text-[var(--text-primary)]">
                  {item.explanationPacket.connection_layer.what_led_to_this}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
                  What it connects to
                </p>
                <p className="mt-1 text-base text-[var(--text-primary)]">
                  {item.explanationPacket.connection_layer.what_it_connects_to}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-2" data-trust-tier={trustLayer.tier}>
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-normal",
              trustLayer.tier === "high" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
            )}
          >
            {trustLayer.heading}
          </p>
          <p
            className={cn(
              trustLayer.tier === "low"
                ? "text-xs font-medium uppercase tracking-normal text-[var(--text-secondary)]"
                : "text-base text-[var(--text-primary)]",
            )}
          >
            {trustLayer.body}
          </p>
          {trustLayer.supportingSignals.length ? (
            <div className="flex flex-wrap gap-2">
              {trustLayer.supportingSignals.map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                >
                  {signal}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
            Related coverage
          </p>
          <div className="flex flex-wrap gap-2">
            {(relatedCoverage ?? item.sources.map((source) => ({
              title: source.title,
              url: source.url,
              sourceName: source.title,
            }))).map((source) =>
              isValidStoryUrl(source.url) ? (
                <a
                  key={`${source.sourceName}-${source.title}-${source.url}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-button border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] underline-offset-2 transition-colors hover:bg-[var(--card)] hover:underline"
                >
                  {source.sourceName}: {source.title}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                </a>
              ) : (
                <span
                  key={`${source.sourceName}-${source.title}-${source.url}`}
                  className="inline-flex items-center gap-2 rounded-button border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)]"
                >
                  {source.sourceName}: {source.title}
                  <span className="text-xs uppercase tracking-normal">Unavailable</span>
                </span>
              ),
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
            Timeline
          </p>
          <TimelineBlock timeline={item.timeline} />
        </section>
      </div>
    </Panel>
  );
}

function TimelineBlock({ timeline }: { timeline: BriefingItem["timeline"] }) {
  if (!timeline?.length) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--text-secondary)]">
        No timeline available yet
      </div>
    );
  }

  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <div className="space-y-4">
        {timeline.map((group) => (
          <div key={group.dateKey} className="grid gap-3 md:grid-cols-[84px_minmax(0,1fr)]">
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-button bg-[var(--text-secondary)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">{group.dateLabel}</p>
            </div>
            <div className="space-y-3">
              {group.entries.map((entry) => (
                <div
                  key={`${group.dateKey}-${entry.source}-${entry.title}`}
                  className="rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3"
                >
                  <p className="text-sm font-semibold leading-6 text-[var(--text-primary)]">{entry.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{entry.summary}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-normal text-[var(--text-secondary)]">
                    {entry.source}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {timeline.reduce((count, group) => count + group.entries.length, 0) === 1 ? (
        <p className="mt-4 text-sm font-medium text-[var(--text-secondary)]">
          Developing story — more updates coming
        </p>
      ) : null}
    </div>
  );
}

function isValidStoryUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
