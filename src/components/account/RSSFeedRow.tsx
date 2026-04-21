"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type RSSFeedRowProps = {
  feed: { feed_id: string; url: string; label?: string };
  onRemove: (feedId: string) => Promise<void>;
};

export function RSSFeedRow({ feed, onRemove }: RSSFeedRowProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setError(null);
    setIsRemoving(true);

    try {
      await onRemove(feed.feed_id);
    } catch (caughtError) {
      setError(caughtError instanceof Error && caughtError.message ? caughtError.message : "Feed not removed");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex w-full items-center justify-between gap-3 rounded-card border border-[var(--line)] p-3 transition-colors lg:hover:bg-[var(--warm)]">
        <div className="min-w-0">
          {feed.label ? (
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{feed.label}</p>
          ) : null}
          <p className="truncate text-sm text-[var(--muted)]">{feed.url}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="ghost" disabled aria-disabled="true" className="min-h-10 px-3">
            Edit
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRemove}
            disabled={isRemoving}
            aria-busy={isRemoving}
            className="min-h-10 gap-2 px-3"
          >
            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Remove
          </Button>
        </div>
      </div>
      {error ? <p className="px-3 text-sm font-medium text-[var(--error)]">{error}</p> : null}
    </div>
  );
}
