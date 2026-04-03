import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

import { toggleReadAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import type { BriefingItem } from "@/lib/types";
import { minutesToLabel } from "@/lib/utils";

export function StoryCard({ item }: { item: BriefingItem }) {
  return (
    <Panel className="p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>{item.topicName}</Badge>
              {item.priority === "top" ? <Badge className="text-[var(--accent)]">Top story</Badge> : null}
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-[var(--muted)]">
                {minutesToLabel(item.estimatedMinutes)}
              </p>
            </div>
          </div>
          <form action={toggleReadAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="current" value={String(item.read)} />
            <button className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-3 py-2 text-sm text-[var(--muted)]">
              {item.read ? <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" /> : <Circle className="h-4 w-4" />}
              {item.read ? "Read" : "Mark as read"}
            </button>
          </form>
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
            Sources
          </p>
          <div className="flex flex-wrap gap-2">
            {item.sources.map((source) => (
              <a
                key={`${source.title}-${source.url}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-white"
              >
                {source.title}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}
