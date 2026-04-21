"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RSSFeedInputProps = {
  onAdd: (url: string) => Promise<void>;
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function RSSFeedInput({ onAdd }: RSSFeedInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = url.trim().length > 0 && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    setError(null);

    if (!isValidUrl(trimmedUrl)) {
      setError("Invalid URL format");
      return;
    }

    setIsSubmitting(true);

    try {
      await onAdd(trimmedUrl);
      setUrl("");
    } catch (caughtError) {
      setError(caughtError instanceof Error && caughtError.message ? caughtError.message : "Feed not added");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="w-full space-y-2" onSubmit={handleSubmit} noValidate>
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Input
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          disabled={isSubmitting}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "rss-feed-input-error" : undefined}
          placeholder="https://example.com/feed.xml"
        />
        <Button
          type="submit"
          disabled={!canSubmit}
          aria-busy={isSubmitting}
          className="min-h-11 w-full gap-2 sm:w-auto"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Add Feed
        </Button>
      </div>
      {error ? (
        <p id="rss-feed-input-error" className="text-sm font-medium text-[var(--error)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
