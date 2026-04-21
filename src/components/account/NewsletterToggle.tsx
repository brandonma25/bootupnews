"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";

type NewsletterToggleProps = {
  enabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
};

export function NewsletterToggle({ enabled, onToggle }: NewsletterToggleProps) {
  const [currentEnabled, setCurrentEnabled] = useState(enabled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setCurrentEnabled(enabled);
    }
  }, [enabled, isLoading]);

  async function handleToggle(nextEnabled: boolean) {
    const previousEnabled = currentEnabled;
    setCurrentEnabled(nextEnabled);
    setIsLoading(true);
    setError(null);

    try {
      await onToggle(nextEnabled);
    } catch (caughtError) {
      setCurrentEnabled(previousEnabled);
      setError(caughtError instanceof Error && caughtError.message ? caughtError.message : "Newsletter preference not updated");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex w-full items-center justify-between gap-4 rounded-card border border-[var(--line)] p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">Daily email digest</p>
          <p className="text-sm text-[var(--muted)]">
            {currentEnabled ? "Subscribed" : "Not subscribed"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" aria-hidden="true" /> : null}
          <Switch
            checked={currentEnabled}
            disabled={isLoading}
            onCheckedChange={(nextEnabled) => void handleToggle(nextEnabled)}
            aria-label="Daily email digest"
          />
        </div>
      </div>
      {error ? <p className="px-4 text-sm font-medium text-[var(--error)]">{error}</p> : null}
    </div>
  );
}
