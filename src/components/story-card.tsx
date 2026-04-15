import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

import { toggleReadAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import type { BriefingItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { minutesToLabel } from "@/lib/utils";

export function StoryCard({ item }: { item: BriefingItem }) {
  const primarySourceUrl = item.sources.find((source) => isValidStoryUrl(source.url))?.url;
  const sourceCount = item.sourceCount ?? item.sources.length;
  const relatedCoverage = item.relatedArticles?.length ? item.relatedArticles : null;

  return (
    <Panel className={cn("p-6 transition-opacity", item.read && "opacity-50 hover:opacity-80")}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>{item.topicName}</Badge>
              {item.priority === "top" ? (
                <Badge className="text-[var(--accent)]">Top event</Badge>
              ) : null}
              <Badge>{sourceCount} {sourceCount === 1 ? "source" : "sources"}</Badge>
              {item.read ? (
                <Badge className="text-[var(--muted)]">Read</Badge>
              ) : null}
            </div>
            <div>
              {primarySourceUrl ? (
                <a
                  href={primarySourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex items-start gap-2 text-xl font-semibold tracking-tight underline-offset-4 hover:underline",
                    item.read ? "text-[var(--muted)]" : "text-[var(--foreground)]",
                  )}
                >
                  <span>{item.title}</span>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
                </a>
              ) : (
                <div>
                  <h3
                    className={cn(
                      "text-xl font-semibold tracking-tight",
                      item.read ? "text-[var(--muted)]" : "text-[var(--foreground)]",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Source unavailable
                  </p>
                </div>
              )}
              <p className="mt-1.5 text-sm font-medium text-[var(--muted)]">
                {minutesToLabel(item.estimatedMinutes)}
              </p>
              {item.matchedKeywords?.length ? (
                <p className="mt-2 text-sm font-medium text-[var(--accent)]">
                  Matched on: {item.matchedKeywords.join(", ")}
                </p>
              ) : null}
            </div>
          </div>

          {item.id.startsWith("generated-") ? null : (
            <form action={toggleReadAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="current" value={String(item.read)} />
              <button
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                  item.read
                    ? "border-[rgba(31,79,70,0.18)] bg-[rgba(31,79,70,0.06)] text-[var(--accent)]"
                    : "border-[var(--line)] bg-white/60 text-[var(--muted)] hover:bg-white",
                )}
              >
                {item.read ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                {item.read ? "Read" : "Mark as read"}
              </button>
            </form>
          )}
        </div>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            What happened
          </p>
          <p className="text-sm leading-7 text-[var(--foreground)]">{item.whatHappened}</p>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Key points
          </p>
          <ul className="space-y-2 text-sm leading-7 text-[var(--foreground)]">
            {item.keyPoints.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Why it matters
          </p>
          <p className="text-sm leading-7 text-[var(--foreground)]">{item.whyItMatters}</p>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
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
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-sm font-medium text-[var(--foreground)] underline-offset-2 transition-colors hover:bg-white hover:underline"
                >
                  {source.sourceName}: {source.title}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                </a>
              ) : (
                <span
                  key={`${source.sourceName}-${source.title}-${source.url}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/50 px-3 py-2 text-sm font-medium text-[var(--muted)]"
                >
                  {source.sourceName}: {source.title}
                  <span className="text-xs uppercase tracking-[0.14em]">Unavailable</span>
                </span>
              ),
            )}
          </div>
        </section>
      </div>
    </Panel>
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
